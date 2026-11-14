"use server"

import { headers } from "next/headers"

import type { FeedbackContext, FeedbackKind, FeedbackSite } from "@/lib/feedback/options"
import { createClient } from "@/lib/supabase/server"
import { readBuild } from "@/lib/system/heartbeat"

export type SendFeedbackResult = { ok: true } | { ok: false; message: string }

const ERRORS: Record<string, string> = {
  "not signed in": "Please log in again to send feedback.",
  "body required": "Tell us a little about it first.",
  "too many": "That's a lot of feedback today, thank you! Please send the rest tomorrow.",
  "bad screenshot": "That screenshot didn't upload. Try again, or send it without one.",
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined)

/** Saves a report from the Feedback button. The screenshot (if any) is already uploaded to the tester's own folder. */
export async function sendFeedback(input: {
  kind: FeedbackKind
  body: string
  site: FeedbackSite
  path: string
  screenshot: string | null
  context: FeedbackContext
}): Promise<SendFeedbackResult> {
  const h = await headers()
  const c = input.context ?? {}
  const context = {
    browser: str(h.get("user-agent"), 300),
    screen: str(c.screen, 20),
    viewport: str(c.viewport, 20),
    language: str(c.language, 20),
    commit: readBuild().commit?.slice(0, 40),
    errors: Array.isArray(c.errors)
      ? c.errors.slice(-5).map((e) => ({ message: str(e?.message, 300) ?? "", at: str(e?.at, 30) ?? "" }))
      : undefined,
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc("feedback_submit", {
    p_kind: input.kind,
    p_body: String(input.body ?? "").slice(0, 4000),
    p_site: input.site,
    p_path: String(input.path ?? "/").slice(0, 500),
    p_screenshot: input.screenshot,
    p_context: context,
  })
  if (error) {
    const known = ERRORS[error.message]
    if (!known) console.error("feedback_submit failed:", error.message)
    return { ok: false, message: known ?? "Couldn't send that. Please try again." }
  }
  return { ok: true }
}
