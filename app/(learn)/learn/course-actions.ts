"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isUuid } from "@/lib/learning/data"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

export type ToolResult = { ok: true; message?: string } | { ok: false; message: string }

export async function setCourseArchived(courseId: string, archived: boolean): Promise<ToolResult> {
  if (!isUuid(courseId)) return { ok: false, message: "Course not found." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("set_course_archived", { p_course: courseId, p_archived: archived })
  if (error || !data) {
    if (error) console.error("set_course_archived failed:", error.message)
    return { ok: false, message: "Couldn't update this course. Please try again." }
  }
  revalidatePath("/learn")
  revalidatePath(`/learn/${courseId}`)
  return { ok: true }
}

/** Permanently delete a course with its lessons and chats. The monthly free-course count is not refunded. */
export async function deleteCourse(courseId: string): Promise<ToolResult> {
  if (!isUuid(courseId)) return { ok: false, message: "Course not found." }
  const supabase = await createClient()
  const { data, error } = await supabase.from("courses").delete().eq("id", courseId).select("id")
  if (error || !data?.length) {
    if (error) console.error("delete course failed:", error.message)
    return { ok: false, message: "Couldn't delete this course. Please try again." }
  }
  revalidatePath("/learn")
  redirect("/learn")
}

const REGEN_MESSAGES: Record<string, string> = {
  no_credits: "Regenerating a lesson uses 5 credits. Get more from your account page.",
  daily_limit: "You can regenerate up to 5 lessons a day. Please try again tomorrow.",
  not_written: "This lesson hasn't been written yet.",
  not_found: "Lesson not found.",
}

/** Clear the lesson (5 credits) so it is written again the next time the page loads. */
export async function regenerateLesson(courseId: string, lessonId: string): Promise<ToolResult> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { ok: false, message: "Lesson not found." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("app_reset_lesson", { p_key: serverKey(), p_lesson: lessonId })
    .single<{ result: string; credits_left: number }>()
  if (error || !data) {
    if (error) console.error("app_reset_lesson failed:", error.message)
    return { ok: false, message: "Couldn't regenerate this lesson. Please try again." }
  }
  if (data.result !== "ok") return { ok: false, message: REGEN_MESSAGES[data.result] ?? "Couldn't regenerate this lesson." }
  revalidatePath(`/learn/${courseId}/${lessonId}`)
  return { ok: true, message: `Done. ${data.credits_left} credits left.` }
}

const REASONS = new Set(["wrong", "confusing", "broken", "inappropriate", "other"])

export async function reportLesson(lessonId: string, reason: string, details: string): Promise<ToolResult> {
  if (!isUuid(lessonId) || !REASONS.has(reason)) return { ok: false, message: "Please pick what's wrong." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("report_lesson", {
    p_lesson: lessonId,
    p_reason: reason,
    p_details: details.slice(0, 1000),
  })
  if (error) {
    console.error("report_lesson failed:", error.message)
    return { ok: false, message: "Couldn't send your report. Please try again." }
  }
  if (data === "daily_limit") return { ok: false, message: "You've sent a lot of reports today. Please try again tomorrow." }
  if (data !== "ok") return { ok: false, message: "Lesson not found." }
  return { ok: true, message: "Thanks! We'll look into it." }
}
