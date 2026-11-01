import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

// Razorpay Orders API + signature checks. Keys come from .env.local:
// RAZORPAY_KEY_ID (public, sent to Checkout), RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function razorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? ""
}

export async function createRazorpayOrder(args: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw new Error("Razorpay keys are not set")
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: args.amountPaise, currency: "INR", receipt: args.receipt, notes: args.notes }),
    signal: AbortSignal.timeout(15000),
  })
  const body = (await res.json().catch(() => null)) as { id?: string; amount?: number; error?: { description?: string } } | null
  if (!res.ok || !body?.id) {
    throw new Error(`Razorpay order failed (${res.status}): ${body?.error?.description ?? "no details"}`)
  }
  return { id: body.id, amount: body.amount ?? args.amountPaise }
}

function safeEqualHex(expected: string, given: string) {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(given, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Checkout success callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  return safeEqualHex(expected, signature)
}

/** Webhook: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex")
  return safeEqualHex(expected, signature)
}

/** Fetch a payment to confirm its amount and status (used by the checkout callback). */
export async function fetchRazorpayPayment(paymentId: string) {
  const id = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw new Error("Razorpay keys are not set")
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Razorpay payment fetch failed (${res.status})`)
  return (await res.json()) as { id: string; order_id: string; amount: number; status: string }
}
