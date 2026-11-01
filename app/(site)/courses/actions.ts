"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { professorForCategory } from "@/lib/learning/catalog"
import { getCatalogCourse } from "@/lib/learning/course-catalog"
import { COURSE_LIMIT_MESSAGES } from "@/lib/learning/plans"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

export type StartState = { error?: string }

/**
 * Start a ready-made course: copy its syllabus into a personal course (no AI planning call).
 * Lessons are written for the learner when first opened. Counts as a new course for the monthly allowance.
 */
export async function startCatalogCourse(_prev: StartState, formData: FormData): Promise<StartState> {
  const slug = String(formData.get("slug") ?? "")
  const course = getCatalogCourse(slug)
  if (!course) return { error: "That course isn't available." }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/create-account?next=${encodeURIComponent(`/courses/${slug}`)}`)

  // Already started (and not archived)? Continue it instead of making a copy.
  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("title", course.title)
    .eq("subcategory", course.subcategory)
    .neq("status", "archived")
    .limit(1)
    .maybeSingle()
  if (existing) redirect(`/learn/${existing.id}`)

  const { data: allowance, error: allowanceError } = await supabase
    .rpc("course_allowance")
    .single<{ allowed: boolean; reason: string | null }>()
  if (allowanceError) {
    console.error("course_allowance failed:", allowanceError.message)
    return { error: "Something went wrong. Please try again." }
  }
  if (!allowance?.allowed) {
    return { error: COURSE_LIMIT_MESSAGES[allowance?.reason ?? ""] ?? "You can't start a new course right now." }
  }

  const { data: courseId, error } = await supabase.rpc("app_create_course", {
    p_key: serverKey(),
    p_course: {
      title: course.title,
      summary: course.summary,
      level: course.level,
      estimated_weeks: course.estimated_weeks,
      goal: `${course.title}: ${course.outcomes.join("; ")}`,
      category: course.category,
      subcategory: course.subcategory,
      professor: professorForCategory(course.category).id,
      welcome: course.welcome,
    },
    p_modules: course.modules,
  })
  if (error || !courseId) {
    console.error("app_create_course (catalog) failed:", error?.message)
    if (error?.message === "course_daily_limit") return { error: COURSE_LIMIT_MESSAGES.daily_limit }
    if (error?.message === "course_monthly_limit") return { error: COURSE_LIMIT_MESSAGES.monthly_limit }
    return { error: "We couldn't start this course. Please try again." }
  }
  revalidatePath("/learn")
  redirect(`/learn/${courseId as string}`)
}
