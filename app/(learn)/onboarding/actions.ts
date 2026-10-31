"use server"

import { redirect } from "next/navigation"

import { AIError, generateCoursePlan } from "@/lib/ai/llm"
import { OnboardingSchema } from "@/lib/learning/schemas"
import { createClient } from "@/lib/supabase/server"

export type OnboardingState = { error?: string }

const MAX_COURSES_PER_DAY = 3

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

  // Each course costs an AI call; keep it reasonable per user.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase.from("courses").select("id", { count: "exact", head: true }).gte("created_at", since)
  if ((count ?? 0) >= MAX_COURSES_PER_DAY) {
    return { error: `You can create up to ${MAX_COURSES_PER_DAY} courses a day. Please come back tomorrow.` }
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
    })
    .select("id")
    .single()
  if (courseError || !course) {
    console.error("courses insert failed:", courseError?.message)
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
