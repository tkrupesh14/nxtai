"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

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
