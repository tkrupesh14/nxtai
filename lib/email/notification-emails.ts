import "server-only"

import { createClient } from "@supabase/supabase-js"

import { renderDigest, unsubscribeUrl, type DigestItem } from "@/lib/email/digest"
import { emailConfigured, sendEmail } from "@/lib/email/send"
import { logError } from "@/lib/error-log"
import { serverKey } from "@/lib/supabase/server-key"

type Due = { user_id: string; email: string; name: string; unsubscribe_token: string; items: DigestItem[] }

const SITE = "https://krpex.in"

let running = false

/** One pass: email everyone who is due (migration 024 decides who and what). Returns how many were sent. */
export async function sendNotificationEmails(): Promise<number> {
  if (running || !emailConfigured()) return 0
  running = true
  let sent = 0
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc("app_due_notification_emails", { p_key: serverKey(), p_limit: 50 })
    if (error) throw new Error(`due: ${error.message}`)
    for (const d of (data ?? []) as Due[]) {
      if (!d.items?.length) continue
      const mail = renderDigest({ name: d.name, items: d.items, token: d.unsubscribe_token, site: SITE })
      try {
        await sendEmail({
          to: d.email,
          ...mail,
          unsubscribe: {
            url: unsubscribeUrl(d.unsubscribe_token, SITE),
            oneClickUrl: `${SITE}/api/unsubscribe?t=${encodeURIComponent(d.unsubscribe_token)}`,
          },
        })
      } catch (e) {
        // Skip this person for now; the next pass tries again. Never log the address.
        logError("server", `notification email failed: ${e instanceof Error ? e.message : e}`, "notification-emails")
        continue
      }
      const { error: markError } = await supabase.rpc("app_mark_notifications_emailed", {
        p_key: serverKey(),
        p_user: d.user_id,
        p_ids: d.items.map((i) => i.id),
      })
      if (markError) logError("server", `notification email mark failed: ${markError.message}`, "notification-emails")
      sent++
    }
  } catch (e) {
    logError("server", `notification emails: ${e instanceof Error ? e.message : e}`, "notification-emails")
  } finally {
    running = false
  }
  return sent
}
