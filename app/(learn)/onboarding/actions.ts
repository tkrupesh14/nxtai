"use server"

import { redirect } from "next/navigation"

import { AIError, checkGoal, generateCoursePlan } from "@/lib/ai/llm"
import { professorForCategory } from "@/lib/learning/catalog"
import { COURSE_LIMIT_MESSAGES } from "@/lib/learning/plans"
import { OnboardingSchema } from "@/lib/learning/schemas"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

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
      professor: professorForCategory(input.category).id,
      welcome: plan.welcome_message,
    },
    p_modules: plan.modules.map((m) => ({
      title: m.title,
      summary: m.summary,
      lessons: m.lessons.map((l) => ({ title: l.title, objective: l.objective, est_minutes: l.est_minutes })),
    })),
  })
  if (courseError || !courseId) {
    console.error("app_create_course failed:", courseError?.message)
    if (courseError?.message === "course_daily_limit") return { error: COURSE_LIMIT_MESSAGES.daily_limit }
    if (courseError?.message === "course_monthly_limit") return { error: COURSE_LIMIT_MESSAGES.monthly_limit }
    return { error: "We couldn't save your course. Please try again." }
  }

  redirect(`/learn/${courseId as string}`)
}
