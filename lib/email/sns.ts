import "server-only"

import { createVerify } from "node:crypto"

/**
 * Amazon SNS messages (SES events, E.4). Every message is signed by AWS; we check the signature with AWS's
 * certificate before trusting it, and only accept our own topic (SES_SNS_TOPIC_ARN).
 */
export type SnsMessage = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation"
  MessageId: string
  TopicArn: string
  Message: string
  Timestamp: string
  Signature: string
  SignatureVersion: "1" | "2"
  SigningCertURL: string
  Subject?: string
  SubscribeURL?: string
  Token?: string
}

const CERT_URL = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/[A-Za-z0-9/_.-]+\.pem$/
const SUBSCRIBE_URL = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\//
const certs = new Map<string, string>()

export function snsStringToSign(m: SnsMessage) {
  const keys =
    m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"]
  return keys.map((k) => `${k}\n${(m as Record<string, unknown>)[k] ?? ""}\n`).join("")
}

export async function verifySns(m: SnsMessage): Promise<boolean> {
  if (!m || typeof m.Signature !== "string" || !CERT_URL.test(m.SigningCertURL ?? "")) return false
  let pem = certs.get(m.SigningCertURL)
  if (!pem) {
    const r = await fetch(m.SigningCertURL, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) return false
    pem = await r.text()
    if (!pem.includes("BEGIN CERTIFICATE")) return false
    certs.set(m.SigningCertURL, pem)
  }
  const v = createVerify(m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1")
  v.update(snsStringToSign(m), "utf8")
  return v.verify(pem, m.Signature, "base64")
}

export async function confirmSubscription(m: SnsMessage) {
  if (!m.SubscribeURL || !SUBSCRIBE_URL.test(m.SubscribeURL)) return false
  const r = await fetch(m.SubscribeURL, { signal: AbortSignal.timeout(5000) })
  return r.ok
}

/** The SES event inside a notification: its message id, kind, and the addresses it is about. */
export function sesEvent(message: string): { messageId: string; type: "delivery" | "bounce" | "complaint"; emails: string[] } | null {
  let e: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    e = JSON.parse(message)
  } catch {
    return null
  }
  const kind = String(e.eventType ?? e.notificationType ?? "")
  const messageId = typeof e.mail?.messageId === "string" ? e.mail.messageId : null
  if (!messageId) return null
  const addresses = (list: unknown) =>
    (Array.isArray(list) ? list : []).map((r: { emailAddress?: unknown }) => String(r?.emailAddress ?? "").toLowerCase()).filter(Boolean)
  if (kind === "Delivery") return { messageId, type: "delivery", emails: [] }
  // Only permanent bounces mean the address is gone; soft ones (full mailbox, timeouts) are left alone.
  if (kind === "Bounce" && e.bounce?.bounceType === "Permanent") return { messageId, type: "bounce", emails: addresses(e.bounce.bouncedRecipients) }
  if (kind === "Complaint") return { messageId, type: "complaint", emails: addresses(e.complaint?.complainedRecipients) }
  return null
}
