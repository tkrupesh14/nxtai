import { NextResponse } from "next/server"

import { recordSesEvent } from "@/lib/email/campaign-server"
import { confirmSubscription, sesEvent, verifySns, type SnsMessage } from "@/lib/email/sns"
import { logError } from "@/lib/error-log"

// SES events for campaign emails (delivery, bounce, complaint), sent by Amazon SNS. Unsigned messages, other
// topics and anything before SES_SNS_TOPIC_ARN is set are refused.
export async function POST(request: Request) {
  const topic = process.env.SES_SNS_TOPIC_ARN
  if (!topic) return NextResponse.json({ error: "not configured" }, { status: 503 })
  let m: SnsMessage
  try {
    m = JSON.parse(await request.text())
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 })
  }
  if (m?.TopicArn !== topic || !(await verifySns(m).catch(() => false))) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  if (m.Type === "SubscriptionConfirmation") {
    const ok = await confirmSubscription(m).catch(() => false)
    return NextResponse.json({ ok }, { status: ok ? 200 : 502 })
  }
  if (m.Type !== "Notification") return NextResponse.json({ ok: true })

  const e = sesEvent(m.Message)
  if (!e) return NextResponse.json({ ok: true })
  try {
    if (e.emails.length === 0) await recordSesEvent(e.messageId, e.type, null)
    for (const email of e.emails) await recordSesEvent(e.messageId, e.type, email)
  } catch (err) {
    logError("server", `SES event failed: ${err instanceof Error ? err.message : err}`, "/api/email/ses")
    return NextResponse.json({ error: "retry" }, { status: 500 }) // SNS tries again
  }
  return NextResponse.json({ ok: true })
}
