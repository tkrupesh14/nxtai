import "server-only"

import { createClient } from "@supabase/supabase-js"

import { renderCampaign, type CampaignContent } from "@/lib/email/campaign"
import { trackedLink } from "@/lib/email/campaign-links"
import { sendCampaignMail, sesConfigured } from "@/lib/email/ses"
import { logError } from "@/lib/error-log"
import { serverKey } from "@/lib/supabase/server-key"

type Claimed = { id: number; token: string; email: string; name: string | null; campaign: CampaignContent & { id: string } }

const BATCH = 20 // per minute: 1,200 an hour at most; the daily cap (app_email_claim) is the real limit

let running = false

/** One pass of campaign sending (background job, every minute). Returns how many were sent. Never logs addresses. */
export async function sendCampaignBatch(): Promise<number> {
  if (running || !sesConfigured()) return 0
  running = true
  let sent = 0
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc("app_email_claim", { p_key: serverKey(), p_limit: BATCH })
    if (error) throw new Error(`claim: ${error.message}`)
    for (const c of (data ?? []) as Claimed[]) {
      let messageId: string | null = null
      let failure: string | null = null
      try {
        const mail = renderCampaign(c.campaign, { name: c.name, token: c.token, trackLink: (u) => trackedLink(c.token, u) })
        messageId = await sendCampaignMail({ to: c.email, fromName: c.campaign.from_name, ...mail })
        sent++
      } catch (e) {
        failure = (e instanceof Error ? e.message : String(e)).replace(/\S+@\S+/g, "<address>").slice(0, 300)
      }
      const { error: markError } = await supabase.rpc("app_email_sent", {
        p_key: serverKey(),
        p_id: c.id,
        p_message_id: messageId ?? "",
        p_error: failure,
      })
      if (markError) logError("server", `campaign mark failed: ${markError.message}`, "email-campaigns")
      if (failure) logError("server", `campaign email failed: ${failure}`, "email-campaigns")
    }
  } catch (e) {
    logError("server", `email campaigns: ${e instanceof Error ? e.message : e}`, "email-campaigns")
  } finally {
    running = false
  }
  return sent
}
