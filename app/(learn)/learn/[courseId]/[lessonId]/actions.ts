"use server"

import { revalidatePath } from "next/cache"

import { AIError, generateLesson } from "@/lib/ai/llm"
import { getCourse, isUnlocked, isUuid } from "@/lib/learning/data"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

export type GenerateResult = { status: "ready" } | { status: "pending" } | { status: "error"; message: string }

/** Generate the lesson body + quiz the first time it is opened. Safe against double clicks / two tabs. */
export async function generateLessonAction(courseId: string, lessonId: string): Promise<GenerateResult> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { status: "error", message: "Lesson not found." }
  const supabase = await createClient()
  const data = await getCourse(courseId)
  if (!data) return { status: "error", message: "Course not found." }
  const index = data.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) return { status: "error", message: "Lesson not found." }
  if (!isUnlocked(data.lessons, index)) return { status: "error", message: "Finish the previous lesson first." }

  // Claim the generation so only one request calls the AI (server-only function, migration 008).
  const { data: claim, error: claimError } = await supabase
    .rpc("app_claim_lesson", { p_key: serverKey(), p_lesson: lessonId })
    .single<{ status: string; claimed_at: string | null }>()
  if (claimError || !claim) {
    console.error("app_claim_lesson failed:", claimError?.message)
    return { status: "error", message: "We couldn't open this lesson. Please try again." }
  }
  if (claim.status === "ready") return { status: "ready" }
  if (claim.status === "pending") return { status: "pending" }
  if (claim.status === "locked") return { status: "error", message: "Finish the previous lesson first." }
  if (claim.status !== "claimed" || !claim.claimed_at) return { status: "error", message: "Lesson not found." }
  const claimedAt = claim.claimed_at

  const lesson = data.lessons[index]
  const mod = data.modules.find((m) => m.id === lesson.module_id)
  const outline = data.modules
    .map((m) => {
      const items = data.lessons
        .filter((l) => l.module_id === m.id)
        .map((l) => `${l.id === lessonId ? "  » " : "  - "}${l.title}`)
        .join("\n")
      return `Module ${m.position + 1}: ${m.title}\n${items}`
    })
    .join("\n")
  const { data: profile } = await supabase.from("learner_profiles").select("learning_style, background").maybeSingle()

  try {
    const content = await generateLesson({
      categoryId: data.course.category,
      background: profile?.background,
      previousLessonTitle: index > 0 ? data.lessons[index - 1].title : null,
      courseTitle: data.course.title,
      courseLevel: data.course.level,
      goal: data.course.goal,
      outline,
      moduleTitle: mod?.title ?? "",
      lessonTitle: lesson.title,
      objective: lesson.objective,
      estMinutes: lesson.est_minutes,
      learningStyle: profile?.learning_style,
    })
    const { data: saved, error } = await supabase.rpc("app_save_lesson", {
      p_key: serverKey(),
      p_lesson: lessonId,
      p_claimed_at: claimedAt,
      p_blocks: content.blocks,
      p_takeaways: content.key_takeaways,
      p_quiz: content.quiz,
    })
    if (error) throw error
    if (!saved) throw new Error("lesson claim was lost before saving")
    revalidatePath(`/learn/${courseId}/${lessonId}`)
    return { status: "ready" }
  } catch (e) {
    console.error("lesson generation failed:", e instanceof Error ? e.message : e)
    await supabase.rpc("app_release_lesson", { p_key: serverKey(), p_lesson: lessonId, p_claimed_at: claimedAt })
    return { status: "error", message: e instanceof AIError ? e.userMessage : "We couldn't create this lesson. Please try again." }
  }
}

export type QuizResult = {
  score: number
  passed: boolean
  results: { correct: boolean; answerIndex: number; explanation: string }[]
  nextLessonId: string | null
}

export async function submitQuiz(courseId: string, lessonId: string, answers: number[]): Promise<QuizResult | { error: string }> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: "Lesson not found." }
  if (!Array.isArray(answers) || answers.length > 20 || !answers.every((a) => Number.isInteger(a) && a >= 0 && a < 10)) {
    return { error: "Please answer every question." }
  }
  const supabase = await createClient()
  // Graded in the database (migration 008): the browser never sees the answers before submitting.
  const { data, error } = await supabase.rpc("submit_quiz", { p_lesson: lessonId, p_answers: answers })
  if (error || !data) {
    console.error("submit_quiz failed:", error?.message)
    return { error: "We couldn't save your result. Please try again." }
  }
  const result = data as QuizResult | { error: string }
  revalidatePath(`/learn/${courseId}`)
  return result
}
