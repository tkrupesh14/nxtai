"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { generateLesson, toAIError } from "@/lib/ai/llm"
import { createClient } from "@/lib/supabase/server"
import { GenerateReviewLessonSchema, reviewLessonArgs } from "@/lib/teach/reviews"

export type AdminResult = { ok?: boolean; message?: string }

// Every function below is also checked in the database (require_admin), so these are safe even if called directly.

export async function resolveReport(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_resolve_report", { p_id: id })
  if (error) console.error("admin_resolve_report failed:", error.message)
  revalidatePath("/admin")
}

export async function grantAction(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const email = String(formData.get("email") ?? "").trim()
  const credits = Math.trunc(Number(formData.get("credits") || 0))
  const proDays = Math.trunc(Number(formData.get("pro_days") || 0))
  const note = String(formData.get("note") ?? "").slice(0, 200)
  if (!email.includes("@")) return { message: "Enter the learner's email." }
  if (!Number.isFinite(credits) || !Number.isFinite(proDays) || Math.abs(credits) > 100000 || proDays < 0 || proDays > 3650) {
    return { message: "Check the numbers." }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_grant", { p_email: email, p_credits: credits, p_pro_days: proDays, p_note: note })
  if (error) {
    console.error("admin_grant failed:", error.message)
    return { message: "Couldn't apply that. Are you signed in as an admin?" }
  }
  if (data === "not_found") return { message: `No account with ${email}.` }
  if (data === "nothing") return { message: "Enter credits and/or Pro days." }
  revalidatePath("/admin")
  const parts = [credits ? `${credits > 0 ? "+" : ""}${credits} credits` : "", proDays ? `${proDays} Pro days` : ""].filter(Boolean)
  return { ok: true, message: `Done: ${parts.join(" and ")} for ${email}.` }
}

export type InviteResult = AdminResult & { link?: string }

/** Create a professor invite. The link is shown once (only a hash of its token is stored). */
export async function inviteProfessorAction(_: InviteResult, formData: FormData): Promise<InviteResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const subject = String(formData.get("subject") ?? "")
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { message: "Enter the professor's email." }
  const supabase = await createClient()
  const { data: token, error } = await supabase.rpc("admin_create_professor_invite", { p_email: email, p_subject: subject })
  if (error || typeof token !== "string") {
    console.error("admin_create_professor_invite failed:", error?.message)
    return { message: "Couldn't create the invite. Are you signed in as an admin?" }
  }
  revalidatePath("/admin")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "krpex.in"
  const site = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`
  return { ok: true, message: `Invite for ${email}. Send this link to them; it works once, for 14 days.`, link: `${site}/teach/join?token=${token}` }
}

export async function revokeInvite(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_revoke_professor_invite", { p_id: id })
  if (error) console.error("admin_revoke_professor_invite failed:", error.message)
  revalidatePath("/admin")
}

export async function setProfessorStatus(id: string, status: "approved" | "suspended" | "pending") {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_professor_status", { p_id: id, p_status: status })
  if (error) console.error("admin_set_professor_status failed:", error.message)
  revalidatePath("/admin")
}

export type GenerateResult = AdminResult & { id?: string }

/** Write a sample Physics lesson with the AI and add it to the professors' review queue. Takes about a minute. */
export async function generateReviewLessonAction(_: GenerateResult, formData: FormData): Promise<GenerateResult> {
  const parsed = GenerateReviewLessonSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    objective: String(formData.get("objective") ?? ""),
    level: String(formData.get("level") ?? ""),
    language: String(formData.get("language") ?? ""),
  })
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the form." }
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) return { message: "Admins only." }

  let lesson
  try {
    lesson = await generateLesson(reviewLessonArgs(parsed.data))
  } catch (e) {
    const err = toAIError(e)
    console.error("review lesson generation failed:", err.message)
    return { message: err.userMessage }
  }
  const { data: id, error } = await supabase.rpc("admin_add_review_lesson", {
    p_subject: "science/physics",
    p_language: parsed.data.language,
    p_level: parsed.data.level,
    p_title: parsed.data.title,
    p_objective: parsed.data.objective,
    p_blocks: lesson.blocks,
    p_takeaways: lesson.key_takeaways,
    p_quiz: lesson.quiz,
  })
  if (error || typeof id !== "string") {
    console.error("admin_add_review_lesson failed:", error?.message)
    return { message: "The lesson was written but couldn't be saved. Please try again." }
  }
  revalidatePath("/admin")
  return { ok: true, id, message: `Added "${parsed.data.title}" to the review queue.` }
}

export async function setReviewLessonStatus(id: string, status: "open" | "closed") {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_review_lesson_status", { p_id: id, p_status: status })
  if (error) console.error("admin_set_review_lesson_status failed:", error.message)
  revalidatePath("/admin")
}
