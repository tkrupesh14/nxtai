import "server-only"

import { AIError, generateAssessment, type AssessmentArgs } from "@/lib/ai/llm"
import { getCourse, isUuid, type LessonRow, type ModuleRow } from "@/lib/learning/data"
import { courseLanguage } from "@/lib/learning/language"
import { ASSESSMENT_QUESTIONS } from "@/lib/learning/schemas"
import { getSections } from "@/lib/sources/data"
import { sourceExcerpt } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import { bankShare } from "@/lib/teach/bank"
import { getTeacherContext, getTeacherQuestions } from "@/lib/teach/teacher"
import { searchQuery } from "@/lib/teach/teaching"

// Module tests and the final exam (migration 014). The database decides what's unlocked and grades every try;
// the helpers here mirror its rules for display only.

export type AssessmentRow = {
  id: string
  module_id: string | null
  kind: "module" | "final"
  best_score: number | null
  attempts: number
  passed_at: string | null
}
export type CertificateRow = {
  code: string
  course_id: string | null
  full_name: string
  course_title: string
  course_level: string
  lesson_count: number
  total_minutes: number
  score: number
  issued_at: string
}
export type AssessmentQuestions = {
  retryAt: string | null
  attempts: number
  bestScore: number | null
  passed: boolean
  questions: { i: number; question: string; options: { i: number; text: string }[] }[]
}

export async function getAssessments(courseId: string) {
  const supabase = await createClient()
  const [{ data: rows }, { data: cert }] = await Promise.all([
    supabase.from("assessments").select("id, module_id, kind, best_score, attempts, passed_at").eq("course_id", courseId),
    supabase.from("certificates").select("code").eq("course_id", courseId).maybeSingle(),
  ])
  const list = (rows ?? []) as AssessmentRow[]
  return {
    byModule: new Map(list.filter((a) => a.kind === "module").map((a) => [a.module_id!, a])),
    final: list.find((a) => a.kind === "final") ?? null,
    certificateCode: (cert?.code as string | undefined) ?? null,
  }
}

/** A module test opens once every lesson in the module is passed. */
export function moduleTestUnlocked(lessons: LessonRow[], moduleId: string) {
  const mine = lessons.filter((l) => l.module_id === moduleId)
  return mine.length > 0 && mine.every((l) => l.completed_at)
}

/** The final exam opens once every module test is passed. */
export function finalExamUnlocked(modules: ModuleRow[], byModule: Map<string, AssessmentRow>) {
  return modules.length > 0 && modules.every((m) => byModule.get(m.id)?.passed_at)
}

export async function getAssessmentQuestions(assessmentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("assessment_questions", { p_assessment: assessmentId })
  if (error) console.error("assessment_questions failed:", error.message)
  return (data ?? null) as AssessmentQuestions | null
}

export async function listCertificates() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("certificates")
    .select("code, course_id, full_name, course_title, course_level, lesson_count, total_minutes, score, issued_at")
    .order("issued_at", { ascending: false })
  return (data ?? []) as CertificateRow[]
}

export type PrepareResult = { status: "ready"; id: string } | { status: "pending" } | { status: "error"; message: string }

/**
 * Make sure the module test (moduleId) or final exam (null) has questions: claim it, ask the AI, save.
 * Only one request writes it; others get "pending" and should check again shortly.
 */
export async function prepareAssessment(courseId: string, moduleId: string | null): Promise<PrepareResult> {
  if (!isUuid(courseId) || (moduleId !== null && !isUuid(moduleId))) return { status: "error", message: "Test not found." }
  const data = await getCourse(courseId)
  if (!data) return { status: "error", message: "Course not found." }
  const supabase = await createClient()

  const { data: claim, error } = await supabase
    .rpc("app_claim_assessment", { p_key: serverKey(), p_course: courseId, p_module: moduleId })
    .single<{ status: string; assessment_id: string | null; claimed_at: string | null }>()
  if (error || !claim) {
    console.error("app_claim_assessment failed:", error?.message)
    return { status: "error", message: "We couldn't open this test. Please try again." }
  }
  if (claim.status === "ready" && claim.assessment_id) return { status: "ready", id: claim.assessment_id }
  if (claim.status === "pending") return { status: "pending" }
  if (claim.status === "locked") {
    return { status: "error", message: moduleId ? "Pass every lesson in this module first." : "Pass every module test first." }
  }
  if (claim.status !== "claimed" || !claim.assessment_id || !claim.claimed_at) return { status: "error", message: "Test not found." }
  const { assessment_id: id, claimed_at: claimedAt } = claim

  try {
    const covered = moduleId ? data.lessons.filter((l) => l.module_id === moduleId) : data.lessons
    const refs = [...new Set(covered.flatMap((l) => l.source_sections ?? []))].sort((a, b) => a - b)
    const language = courseLanguage(data.course.language)
    const kind = moduleId ? "module" : "final"
    const topics = searchQuery(...covered.flatMap((l) => [l.title, l.objective]))
    const [{ data: takeaways }, sources, teacher, bank] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, key_takeaways")
        .in("id", covered.map((l) => l.id)),
      getSections(courseId, refs),
      getTeacherContext(data.course.professor, searchQuery(...covered.map((l) => l.title)), 8000),
      // The professor's own questions on these lessons (8.4): up to half of the test.
      getTeacherQuestions(data.course.professor, topics, language, bankShare(ASSESSMENT_QUESTIONS[kind])),
    ])
    const byId = new Map((takeaways ?? []).map((t) => [t.id as string, (t.key_takeaways ?? []) as string[]]))
    const args: AssessmentArgs = {
      kind,
      categoryId: data.course.category,
      courseTitle: data.course.title,
      courseLevel: data.course.level,
      goal: data.course.goal,
      moduleTitle: moduleId ? (data.modules.find((m) => m.id === moduleId)?.title ?? "") : null,
      lessons: covered.map((l) => ({ title: l.title, objective: l.objective, takeaways: (byId.get(l.id) ?? []).slice(0, 5) })),
      sourceText: sources.length ? sourceExcerpt(sources, moduleId ? 30000 : 40000) : null,
      teacher,
      language,
      bank,
    }
    const questions = await generateAssessment(args)
    const { data: saved, error: saveError } = await supabase.rpc("app_save_assessment", {
      p_key: serverKey(),
      p_assessment: id,
      p_claimed_at: claimedAt,
      p_questions: questions,
    })
    if (saveError) throw saveError
    if (!saved) throw new Error("assessment claim was lost before saving")
    return { status: "ready", id }
  } catch (e) {
    console.error("assessment generation failed:", e instanceof Error ? e.message : e)
    await supabase.rpc("app_release_assessment", { p_key: serverKey(), p_assessment: id, p_claimed_at: claimedAt })
    return { status: "error", message: e instanceof AIError ? e.userMessage : "We couldn't write this test. Please try again." }
  }
}
