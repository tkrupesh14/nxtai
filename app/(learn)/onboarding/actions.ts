"use server"

import { redirect } from "next/navigation"

import { AIError, checkGoal, generateCoursePlan } from "@/lib/ai/llm"
import { professorForCategory } from "@/lib/learning/catalog"
import { OnboardingSchema } from "@/lib/learning/schemas"
import { createClient } from "@/lib/supabase/server"

export type OnboardingState = {
  error?: string
  /** Goal check: the goal fits another category better. */
  betterCategory?: string
  /** Goal check: the goal is unclear or not allowed; send the learner back to edit it. */
  reviseGoal?: boolean
}

const COURSE_LIMIT_MESSAGES: Record<string, string> = {
  daily_limit: "You can create up to 3 courses a day. Please come back tomorrow.",
  monthly_limit:
    "You've used this month's free courses. Each extra course uses 20 credits. Recharge from your account page, or finish your current courses first.",
}

export async function createCourse(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = OnboardingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your answers." }
  }
  const input = parsed.data

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
    updated_at: new Date().toISOString(),
  })
  if (profileError) {
    console.error("learner_profiles upsert failed:", profileError.code, profileError.message)
    return { error: "We couldn't save your answers. Please try again." }
  }

  let plan
  try {
    const check = await checkGoal(input)
    if (check.verdict === "wrong_category") {
      return {
        error: check.message || "That goal fits a different category better.",
        betterCategory: check.better_category || undefined,
      }
    }
    if (check.verdict !== "ok") {
      return { error: check.message || "Please describe a clear learning goal.", reviseGoal: true }
    }
    plan = await generateCoursePlan(input)
  } catch (e) {
    console.error("generateCoursePlan failed:", e instanceof Error ? e.message : e)
    return { error: e instanceof AIError ? e.userMessage : "Something went wrong creating your course." }
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      title: plan.title,
      summary: plan.summary,
      level: plan.level,
      estimated_weeks: plan.estimated_weeks,
      goal: input.goal,
      category: input.category,
      subcategory: input.subcategory,
      professor: professorForCategory(input.category).id,
      welcome: plan.welcome_message,
    })
    .select("id")
    .single()
  if (courseError || !course) {
    console.error("courses insert failed:", courseError?.message)
    if (courseError?.message === "course_daily_limit") return { error: COURSE_LIMIT_MESSAGES.daily_limit }
    if (courseError?.message === "course_monthly_limit") return { error: COURSE_LIMIT_MESSAGES.monthly_limit }
    return { error: "We couldn't save your course. Please try again." }
  }

  try {
    const { data: modules, error: modulesError } = await supabase
      .from("course_modules")
      .insert(
        plan.modules.map((m, i) => ({ course_id: course.id, user_id: user.id, position: i, title: m.title, summary: m.summary })),
      )
      .select("id, position")
    if (modulesError || !modules) throw modulesError ?? new Error("no modules returned")

    const moduleIdByPosition = new Map(modules.map((m) => [m.position, m.id]))
    let position = 0
    const lessons = plan.modules.flatMap((m, mi) =>
      m.lessons.map((l) => ({
        course_id: course.id,
        module_id: moduleIdByPosition.get(mi)!,
        user_id: user.id,
        position: position++,
        title: l.title,
        objective: l.objective,
        est_minutes: Math.min(Math.max(l.est_minutes || 30, 10), 90),
      })),
    )
    const { error: lessonsError } = await supabase.from("lessons").insert(lessons)
    if (lessonsError) throw lessonsError
  } catch (e) {
    console.error("saving course outline failed:", e)
    await supabase.from("courses").delete().eq("id", course.id) // cascades to modules/lessons
    return { error: "We couldn't save your course. Please try again." }
  }

  redirect(`/learn/${course.id}`)
}
