import "server-only"

import { createClient } from "@supabase/supabase-js"

import { TOKEN } from "@/lib/email/campaign-links"
import { serverKey } from "@/lib/supabase/server-key"

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

/** Records an open or a click; never throws (tracking must not break the redirect or the image). */
export async function trackEmail(token: string, kind: "open" | "click") {
  if (!TOKEN.test(token)) return
  try {
    const { error } = await anon().rpc("app_email_track", { p_key: serverKey(), p_token: token, p_kind: kind })
    if (error) console.error("email track failed:", error.message)
  } catch (e) {
    console.error("email track failed:", e instanceof Error ? e.message : e)
  }
}

/** Puts whoever got this email on the do-not-send list. "ok", "unknown" or "error". */
export async function unsubscribeCampaign(token: unknown): Promise<"ok" | "unknown" | "error"> {
  if (typeof token !== "string" || !TOKEN.test(token)) return "unknown"
  const { data, error } = await anon().rpc("app_email_unsubscribe", { p_key: serverKey(), p_token: token })
  if (error) {
    console.error("email unsubscribe failed:", error.message)
    return "error"
  }
  return data === "ok" ? "ok" : "unknown"
}

/** An SES event (delivery, permanent bounce, complaint) for one of our messages. */
export async function recordSesEvent(messageId: string, type: "delivery" | "bounce" | "complaint", email: string | null) {
  const { error } = await anon().rpc("app_email_event", { p_key: serverKey(), p_message_id: messageId, p_type: type, p_email: email })
  if (error) throw new Error(error.message)
}
