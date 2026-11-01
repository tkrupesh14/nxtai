import { createHmac } from "node:crypto"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/payments/razorpay"

const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex")

describe("Razorpay signatures", () => {
  const saved = { ...process.env }
  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test-key-secret"
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret"
  })
  afterEach(() => {
    process.env = { ...saved }
  })

  it("accepts a genuine checkout signature", () => {
    expect(verifyPaymentSignature("order_1", "pay_1", hmac("test-key-secret", "order_1|pay_1"))).toBe(true)
  })
  it("rejects a forged or mismatched checkout signature", () => {
    expect(verifyPaymentSignature("order_1", "pay_1", hmac("wrong", "order_1|pay_1"))).toBe(false)
    expect(verifyPaymentSignature("order_1", "pay_2", hmac("test-key-secret", "order_1|pay_1"))).toBe(false)
    expect(verifyPaymentSignature("order_1", "pay_1", "")).toBe(false)
  })
  it("rejects everything when the secret is missing", () => {
    delete process.env.RAZORPAY_KEY_SECRET
    expect(verifyPaymentSignature("order_1", "pay_1", hmac("", "order_1|pay_1"))).toBe(false)
  })
  it("checks webhook bodies byte for byte", () => {
    const body = '{"event":"payment.captured","payload":{}}'
    expect(verifyWebhookSignature(body, hmac("test-webhook-secret", body))).toBe(true)
    expect(verifyWebhookSignature(`${body} `, hmac("test-webhook-secret", body))).toBe(false)
    expect(verifyWebhookSignature(body, "")).toBe(false)
  })
})
