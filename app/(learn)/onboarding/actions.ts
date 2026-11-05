"use server"

import { redirect } from "next/navigation"

import { AIError, checkGoal, generateCoursePlan, generateSourceCoursePlan } from "@/lib/ai/llm"
import { professorForCategory } from "@/lib/learning/catalog"
import { isUuid } from "@/lib/learning/data"
import { COURSE_LIMIT_MESSAGES } from "@/lib/learning/plans"
import { OnboardingSchema, type CoursePlan, type SourceCoursePlan } from "@/lib/learning/schemas"
import { getMaterialForPlan } from "@/lib/sources/data"
import { sourceExcerpt, sourceOutline } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import { getLiveProfessor, getTeacherContext } from "@/lib/teach/teacher"
import { searchQuery, teacherRef } from "@/lib/teach/teaching"

export type OnboardingState = {
  error?: string
  /** Goal check: the goal fits another category better. */
  betterCategory?: string
  /** Goal check: the goal is unclear or not allowed; send the learner back to edit it. */
  reviseGoal?: boolean
}

export async function createCourse(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = OnboardingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers." }
  }
  const input = parsed.data
  // Uploaded material to build the course from (ids from /api/sources, in the learner's order).
  const sourceIds = [...new Set(String(formData.get("sources") ?? "").split(",").filter(isUuid))].slice(0, 3)
  // A live professor whose AI version should teach the course (8.2); must teach this subject.
  const teacherId = String(formData.get("teacher") ?? "")
  const teacher = isUuid(teacherId) ? await getLiveProfessor(teacherId) : null
  if (teacherId && (!teacher || teacher.subject !== `${input.category}/${input.subcategory}`)) {
    return { error: "That professor isn't available for this subject any more. Please choose again." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/onboarding")

  // Each course costs an AI call: check the plan's allowance (or credits) before calling the AI.
  // The courses insert trigger enforces the same rule atomically.
  const { data: allowance, error: allowanceError } = await supabase
    .rpc("course_allowance")
    .single<{ allowed: boolean; reason: string | null }>()
  if (allowanceError) {
    console.error("course_allowance failed:", allowanceError.message)
    return { error: "Something went wrong. Please try again." }
  }
  if (!allowance?.allowed) {
    return { error: COURSE_LIMIT_MESSAGES[allowance?.reason ?? ""] ?? "You can't create a new course right now." }
  }

  const { error: profileError } = await supabase.from("learner_profiles").upsert({
    user_id: user.id,
    goal: input.goal,
    level: input.level,
    background: input.background,
    hours_per_week: input.hours_per_week,
    learning_style: input.learning_style,
    timeline: input.timeline,
    language: input.language,
    updated_at: new Date().toISOString(),
  })
  if (profileError) {
    console.error("learner_profiles upsert failed:", profileError.code, profileError.message)
    return { error: "We couldn't save your answers. Please try again." }
  }

  const material = sourceIds.length ? await getMaterialForPlan(sourceIds) : []
  if (sourceIds.length && material.length !== sourceIds.length) {
    return { error: "One of your files is no longer available (uploads are kept for a day). Please add it again." }
  }
  const sections = material.flatMap((f) => f.sections)

  let plan: CoursePlan | SourceCoursePlan
  try {
    const teaching = teacher ? await getTeacherContext(teacherRef(teacher.id), searchQuery(input.goal, input.background), 6000) : null
    const check = await checkGoal(
      input,
      material.length ? { filenames: material.map((f) => f.filename), sample: sourceExcerpt(sections.slice(0, 3), 3000) } : undefined,
    )
    if (check.verdict === "wrong_category") {
      return {
        error: check.message || "That goal fits a different category better.",
        betterCategory: check.better_category || undefined,
      }
    }
    if (check.verdict !== "ok") {
      return { error: check.message || "Please describe a clear learning goal.", reviseGoal: true }
    }
    plan = material.length
      ? await generateSourceCoursePlan(input, { outline: sourceOutline(material), sectionCount: sections.length }, teaching)
      : await generateCoursePlan(input, teaching)
  } catch (e) {
    console.error("generateCoursePlan failed:", e instanceof Error ? e.message : e)
    return { error: e instanceof AIError ? e.userMessage : "Something went wrong creating your course." }
  }

  // Course, modules and lessons are written in one transaction by a server-only function (migration 008).
  const { data: courseId, error: courseError } = await supabase.rpc("app_create_course", {
    p_key: serverKey(),
    p_course: {
      title: plan.title,
      summary: plan.summary,
      level: plan.level,
      estimated_weeks: plan.estimated_weeks,
      goal: input.goal,
      category: input.category,
      subcategory: input.subcategory,
      professor: teacher ? teacherRef(teacher.id) : professorForCategory(input.category).id,
      welcome: plan.welcome_message,
      language: input.language,
    },
    p_modules: plan.modules.map((m) => ({
      title: m.title,
      summary: m.summary,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        objective: l.objective,
        est_minutes: l.est_minutes,
        ...("sections" in l ? { sections: l.sections } : {}),
      })),
    })),
    ...(sourceIds.length ? { p_sources: sourceIds } : {}),
  })
  if (courseError || !courseId) {
    console.error("app_create_course failed:", courseError?.message)
    if (courseError?.message === "course_daily_limit") return { error: COURSE_LIMIT_MESSAGES.daily_limit }
    if (courseError?.message === "course_monthly_limit") return { error: COURSE_LIMIT_MESSAGES.monthly_limit }
    if (courseError?.message === "invalid_sources") {
      return { error: "Your files couldn't be added to this course (they may be over your plan's limit). Please check them and try again." }
    }
    return { error: "We couldn't save your course. Please try again." }
  }

  redirect(`/learn/${courseId as string}`)
}

/** Remove an upload before the course is built. */
export async function removeSource(id: string): Promise<{ ok: boolean }> {
  if (!isUuid(id)) return { ok: false }
  const supabase = await createClient()
  const { error } = await supabase.from("course_sources").delete().eq("id", id).is("course_id", null)
  return { ok: !error }
}
