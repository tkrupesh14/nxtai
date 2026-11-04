"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isUuid } from "@/lib/learning/data"
import { createClient } from "@/lib/supabase/server"
import { AGREEMENT_VERSION } from "@/lib/teach/agreement"
import { firstProblem, ModelLessonSchema, toLessonBlocks } from "@/lib/teach/lessons"
import { ReviewSchema } from "@/lib/teach/reviews"
import { isTeachLanguage } from "@/lib/teach/subjects"

export type TeachResult = { ok?: boolean; message?: string }

const ACCEPT_ERRORS: Record<string, string> = {
  invite_invalid: "This invite has expired or was already used. Ask Krpex for a new one.",
  wrong_email: "This invite is for a different email address. Sign in with the email it was sent to.",
  already_professor: "You're already a Krpex professor.",
  invalid_name: "Enter your name as learners should see it (2–80 characters).",
}

export async function acceptInvite(_: TeachResult, formData: FormData): Promise<TeachResult> {
  const token = String(formData.get("token") ?? "")
  const name = String(formData.get("display_name") ?? "").replace(/\s+/g, " ").trim()
  if (formData.get("agree") !== "on") return { message: "Please read and accept the agreement to continue." }
  if (name.length < 2 || name.length > 80) return { message: ACCEPT_ERRORS.invalid_name }
  const supabase = await createClient()
  const { error } = await supabase.rpc("accept_professor_invite", {
    p_token: token,
    p_display_name: name,
    p_agreement_version: AGREEMENT_VERSION,
  })
  if (error) {
    const known = ACCEPT_ERRORS[error.message]
    if (!known) console.error("accept_professor_invite failed:", error.message)
    return { message: known ?? "Something went wrong. Please try again." }
  }
  // The header (in the layout) gains a "Teaching" link, so refresh the layout too.
  revalidatePath("/", "layout")
  redirect("/teach?welcome=1")
}

export async function updateProfile(_: TeachResult, formData: FormData): Promise<TeachResult> {
  const text = (k: string, max: number) => String(formData.get(k) ?? "").trim().slice(0, max)
  const languages = formData.getAll("languages").filter(isTeachLanguage)
  const name = text("display_name", 80).replace(/\s+/g, " ")
  if (name.length < 2) return { message: "Enter your name as learners should see it." }
  if (languages.length === 0) return { message: "Choose at least one language you teach in." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("professor_update_profile", {
    p_display_name: name,
    p_title: text("title", 80),
    p_institution: text("institution", 120),
    p_bio: text("bio", 1200),
    p_languages: [...new Set(languages)],
    p_credentials: text("credentials", 1200),
  })
  if (error) {
    console.error("professor_update_profile failed:", error.message)
    return { message: "We couldn't save your profile. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true, message: "Saved." }
}

export async function setMaterialStatus(id: string, status: "draft" | "published"): Promise<TeachResult> {
  if (!isUuid(id) || (status !== "draft" && status !== "published")) return { message: "Something went wrong." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("professor_set_material_status", { p_id: id, p_status: status })
  if (error) {
    if (error.message === "not_approved") return { message: "You can publish once Krpex has approved your profile." }
    console.error("professor_set_material_status failed:", error.message)
    return { message: "We couldn't change that. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true }
}

/** Withdraw material: deleted for good, and no longer used. */
export async function removeMaterial(id: string): Promise<TeachResult> {
  if (!isUuid(id)) return { message: "Something went wrong." }
  const supabase = await createClient()
  const { error, count } = await supabase.from("professor_materials").delete({ count: "exact" }).eq("id", id)
  if (error || !count) {
    if (error) console.error("remove material failed:", error.message)
    return { message: "We couldn't remove that. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true }
}

const LESSON_ERRORS: Record<string, string> = {
  not_professor: "This is only for Krpex professors.",
  suspended: "Your professor account is paused, so lessons can't be saved.",
  too_many_lessons: "You've reached 200 lessons. Remove some to add more.",
  not_found: "This lesson no longer exists.",
  not_approved: "You can publish once Krpex has approved your profile.",
}

/** Save a model lesson (new when id is null). Validated here, ownership and limits checked in the database. */
export async function saveModelLesson(id: string | null, lesson: unknown): Promise<TeachResult & { id?: string }> {
  if (id !== null && !isUuid(id)) return { message: "Something went wrong. Please reload." }
  const problem = firstProblem(lesson)
  if (problem) return { message: problem }
  const l = ModelLessonSchema.parse(lesson)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("professor_save_lesson", {
    p_id: id,
    p_title: l.title,
    p_topic: l.topic,
    p_language: l.language,
    p_objective: l.objective,
    p_blocks: toLessonBlocks(l.blocks),
    p_takeaways: l.key_takeaways,
  })
  if (error || typeof data !== "string") {
    const known = LESSON_ERRORS[error?.message ?? ""]
    if (!known) console.error("professor_save_lesson failed:", error?.message)
    return { message: known ?? "We couldn't save the lesson. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true, id: data, message: "Saved." }
}

export async function setLessonStatus(id: string, status: "draft" | "published"): Promise<TeachResult> {
  if (!isUuid(id) || (status !== "draft" && status !== "published")) return { message: "Something went wrong." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("professor_set_lesson_status", { p_id: id, p_status: status })
  if (error) {
    const known = LESSON_ERRORS[error.message]
    if (!known) console.error("professor_set_lesson_status failed:", error.message)
    return { message: known ?? "We couldn't change that. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true }
}

export async function removeLesson(id: string): Promise<TeachResult> {
  if (!isUuid(id)) return { message: "Something went wrong." }
  const supabase = await createClient()
  const { error, count } = await supabase.from("professor_lessons").delete({ count: "exact" }).eq("id", id)
  if (error || !count) {
    if (error) console.error("remove lesson failed:", error.message)
    return { message: "We couldn't remove that. Please try again." }
  }
  revalidatePath("/teach")
  return { ok: true }
}

const REVIEW_ERRORS: Record<string, string> = {
  not_professor: "Only Krpex professors can review lessons.",
  not_approved: "You can review lessons once Krpex has approved your profile.",
  not_found: "This lesson isn't open for review any more.",
  invalid_notes: "One of your block notes couldn't be saved. Check it and try again.",
}

/** Submit or update this professor's review of a sample AI lesson. */
export async function submitReview(lessonId: string, review: unknown): Promise<TeachResult> {
  if (!isUuid(lessonId)) return { message: REVIEW_ERRORS.not_found }
  const parsed = ReviewSchema.safeParse(review)
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check your review." }
  const r = parsed.data
  const supabase = await createClient()
  const { error } = await supabase.rpc("professor_submit_review", {
    p_lesson: lessonId,
    p_accuracy: r.accuracy,
    p_clarity: r.clarity,
    p_level_fit: r.level_fit,
    p_overall: r.overall,
    p_comment: r.comment,
    p_notes: r.block_notes,
  })
  if (error) {
    const known = REVIEW_ERRORS[error.message]
    if (!known) console.error("professor_submit_review failed:", error.message)
    return { message: known ?? "Couldn't save your review. Please try again." }
  }
  revalidatePath("/teach")
  revalidatePath(`/teach/review/${lessonId}`)
  return { ok: true, message: "Thank you. Your review is saved; you can change it any time." }
}
