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
  revalidatePath("/admin", "layout")
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
  revalidatePath("/admin", "layout")
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
  revalidatePath("/admin", "layout")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "krpex.in"
  const site = `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`
  return { ok: true, message: `Invite for ${email}. Send this link to them; it works once, for 14 days.`, link: `${site}/teach/join?token=${token}` }
}

export async function revokeInvite(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_revoke_professor_invite", { p_id: id })
  if (error) console.error("admin_revoke_professor_invite failed:", error.message)
  revalidatePath("/admin", "layout")
}

export async function setProfessorStatus(id: string, status: "approved" | "suspended" | "pending") {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_professor_status", { p_id: id, p_status: status })
  if (error) console.error("admin_set_professor_status failed:", error.message)
  revalidatePath("/admin", "layout")
}

/** Show (or hide) a professor's AI version to learners (8.2). */
export async function setProfessorLive(id: string, live: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_professor_live", { p_id: id, p_live: live })
  if (error) console.error("admin_set_professor_live failed:", error.message)
  revalidatePath("/admin", "layout")
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
  revalidatePath("/admin", "layout")
  return { ok: true, id, message: `Added "${parsed.data.title}" to the review queue.` }
}

export async function setReviewLessonStatus(id: string, status: "open" | "closed") {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_review_lesson_status", { p_id: id, p_status: status })
  if (error) console.error("admin_set_review_lesson_status failed:", error.message)
  revalidatePath("/admin", "layout")
}

// Community 5b moderation (migration 034).
export async function moderateCommunityAction(target: "post" | "comment", id: string, action: "keep" | "remove", reason: string): Promise<AdminResult> {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_community_moderate", { p_target: target, p_id: id, p_action: action, p_reason: reason.slice(0, 200) })
  if (error) {
    console.error("admin_community_moderate failed:", error.message)
    return { message: "Couldn't do that. It may have changed already." }
  }
  revalidatePath("/admin", "layout")
  return { ok: true }
}

export async function communityBanAction(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase()
  const length = String(formData.get("length") ?? "7")
  const reason = String(formData.get("reason") ?? "").slice(0, 200)
  const days = length === "forever" ? null : Number(length)
  if (!handle || (days !== null && ![0, 7, 30].includes(days))) return { message: "Enter a handle and a length." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_community_ban", { p_handle: handle, p_days: days, p_reason: reason })
  if (error) return { message: error.message.includes("not_found") ? `No one has the handle @${handle}.` : "Couldn't do that." }
  revalidatePath("/admin", "layout")
  return { ok: true, message: days === 0 ? `@${handle} can post again.` : `@${handle} can't post ${days === null ? "any more" : `for ${days} days`}.` }
}

export async function profileVisibilityAction(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const handle = String(formData.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase()
  const hidden = formData.get("hidden") === "hide"
  if (!handle) return { message: "Enter a handle." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_profile_hidden", { p_handle: handle, p_hidden: hidden })
  if (error) return { message: error.message.includes("not_found") ? `No one has the handle @${handle}.` : "Couldn't do that." }
  revalidatePath("/admin", "layout")
  return { ok: true, message: hidden ? `@${handle}'s profile is hidden.` : `@${handle}'s profile can be seen again (if they made it public).` }
}

/** Lift a posting ban from the bans list (6.3). */
export async function liftBanAction(handle: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_community_ban", { p_handle: handle, p_days: 0, p_reason: "" })
  if (error) console.error("admin_community_ban (lift) failed:", error.message)
  revalidatePath("/admin", "layout")
}

/** Turn a community board off (no new discussions, gone from the lists) or back on (6.3). */
export async function setBoardActiveAction(slug: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_board_active", { p_slug: slug, p_active: active })
  if (error) console.error("admin_set_board_active failed:", error.message)
  revalidatePath("/admin", "layout")
  revalidatePath("/community", "layout")
}

/** Set the dollar rate used to show AI costs in rupees (6.4). */
export async function usdInrAction(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const rate = Number(String(formData.get("rate") ?? "").trim())
  if (!Number.isFinite(rate) || rate < 50 || rate > 200) return { message: "Enter a rate between ₹50 and ₹200." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_usd_inr", { p_rate: rate })
  if (error) {
    console.error("admin_set_usd_inr failed:", error.message)
    return { message: "Couldn't save the rate." }
  }
  revalidatePath("/admin", "layout")
  return { ok: true, message: `Saved: $1 = ₹${Math.round(rate * 100) / 100}.` }
}

/** Approve (with Pro for some days) or decline a beta application (closed beta B.1). */
export async function betaDecideAction(userId: string, _: AdminResult, formData: FormData): Promise<AdminResult> {
  const status = formData.get("status")
  if (status !== "approved" && status !== "declined") return { message: "Choose approve or decline." }
  const note = String(formData.get("note") ?? "").slice(0, 500)
  const proDays = Math.trunc(Number(formData.get("pro_days") ?? 30))
  if (!Number.isFinite(proDays) || proDays < 0 || proDays > 365) return { message: "Pro days: 0 to 365." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_beta_decide", { p_user: userId, p_status: status, p_note: note, p_pro_days: proDays })
  if (error) {
    console.error("admin_beta_decide failed:", error.message)
    return { message: "Couldn't save that. Are you signed in as an admin?" }
  }
  if (data === "not_found") return { message: "That application no longer exists." }
  revalidatePath("/admin", "layout")
  return { ok: true, message: status === "approved" ? "Approved." : "Declined." }
}

/** End the closed beta (everyone gets in) or close it again (closed beta B.1). */
export async function setBetaClosedAction(closed: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_beta_closed", { p_closed: closed })
  if (error) console.error("admin_set_beta_closed failed:", error.message)
  revalidatePath("/", "layout")
}
