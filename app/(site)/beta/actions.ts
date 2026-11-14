"use server"

import { revalidatePath } from "next/cache"

import { BETA_DEVICES, BETA_ROLES } from "@/lib/beta/options"
import { createClient } from "@/lib/supabase/server"

export type BetaApplyState = { status: "idle" | "saved" | "error"; message?: string }

const MESSAGES: Record<string, string> = {
  approved: "You're already in the beta.",
  declined: "We can't take you into the beta just yet. We'll let you know when Krpex opens to everyone.",
  open: "Krpex is open to everyone now, so there's nothing to apply for.",
}

/** Save (or change, while it waits) this account's beta application. The database checks everything again (beta_apply). */
export async function applyForBeta(_prev: BetaApplyState, formData: FormData): Promise<BetaApplyState> {
  const name = String(formData.get("name") ?? "").trim()
  const role = String(formData.get("role") ?? "")
  const goal = String(formData.get("goal") ?? "").trim()
  const device = String(formData.get("device") ?? "")
  const heard = String(formData.get("heard_from") ?? "").trim()
  const consent = formData.get("consent") === "on"

  if (!name || name.length > 80) return { status: "error", message: "Please enter your name (up to 80 characters)." }
  if (!BETA_ROLES.some((r) => r.id === role)) return { status: "error", message: "Please choose what describes you best." }
  if (goal.length < 3 || goal.length > 500) return { status: "error", message: "Please tell us what you'd like to learn (up to 500 characters)." }
  if (!BETA_DEVICES.some((d) => d.id === device)) return { status: "error", message: "Please choose the device you'll mostly use." }
  if (heard.length > 200) return { status: "error", message: "Please keep “How did you hear about Krpex?” under 200 characters." }
  if (!consent) return { status: "error", message: "Beta testers agree to activity tracking and session recording. Please tick the box to apply." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("beta_apply", {
    p_name: name,
    p_role: role,
    p_goal: goal,
    p_device: device,
    p_heard_from: heard,
    p_consent: consent,
  })
  if (error) {
    console.error("beta_apply failed:", error.code, error.message)
    if (error.message === "not signed in") return { status: "error", message: "Please log in again, then apply." }
    return { status: "error", message: "We couldn't save your application right now. Please try again shortly." }
  }
  revalidatePath("/beta")
  if (data !== "ok") return { status: "error", message: MESSAGES[String(data)] ?? "We couldn't save your application." }
  return { status: "saved", message: "Thanks! Your application is saved." }
}
