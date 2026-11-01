"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"

import { isProductId, PRODUCTS } from "@/lib/learning/plans"
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "@/lib/payments/razorpay"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

export type OrderResult =
  | { ok: true; orderId: string; amount: number; keyId: string; description: string; name: string; email: string }
  | { ok: false; message: string }

const MAX_ORDERS_PER_HOUR = 10

/** Create a Razorpay order for a product. The price comes from the server's product list. */
export async function createOrder(productId: string): Promise<OrderResult> {
  if (!isProductId(productId)) return { ok: false, message: "That product isn't available." }
  if (!razorpayConfigured()) return { ok: false, message: "Payments aren't available yet. Please try again later." }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Please sign in again." }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase.from("payment_orders").select("id", { count: "exact", head: true }).gte("created_at", since)
  if ((count ?? 0) >= MAX_ORDERS_PER_HOUR) return { ok: false, message: "Too many attempts. Please try again in an hour." }

  const product = PRODUCTS[productId]
  const amountPaise = product.priceInr * 100
  try {
    const order = await createRazorpayOrder({
      amountPaise,
      receipt: `nxt_${randomBytes(8).toString("hex")}`,
      notes: { user_id: user.id, product: productId },
    })
    const { error } = await supabase.rpc("app_create_order", {
      p_key: serverKey(),
      p_razorpay_order_id: order.id,
      p_product: productId,
      p_amount_paise: amountPaise,
      p_credits: product.credits,
      p_pro_days: product.proDays,
    })
    if (error) throw new Error(`app_create_order: ${error.message}`)
    const meta = user.user_metadata ?? {}
    return {
      ok: true,
      orderId: order.id,
      amount: amountPaise,
      keyId: razorpayKeyId(),
      description: product.label,
      name: String(meta.full_name || meta.name || ""),
      email: user.email ?? "",
    }
  } catch (e) {
    console.error("createOrder failed:", e instanceof Error ? e.message : e)
    return { ok: false, message: "We couldn't start the payment. Please try again." }
  }
}

export type ConfirmResult = { ok: true; status: "applied" | "pending" } | { ok: false; message: string }

const ID_RE = /^[A-Za-z0-9_]{6,64}$/
const SIG_RE = /^[a-f0-9]{64}$/

/** Checkout success callback: check Razorpay's signature and the captured amount, then add credits / Pro. */
export async function confirmPayment(orderId: string, paymentId: string, signature: string): Promise<ConfirmResult> {
  if (!ID_RE.test(orderId) || !ID_RE.test(paymentId) || !SIG_RE.test(signature)) {
    return { ok: false, message: "We couldn't verify this payment." }
  }
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    console.warn("confirmPayment: bad signature", orderId)
    return { ok: false, message: "We couldn't verify this payment." }
  }
  const supabase = await createClient()
  try {
    const payment = await fetchRazorpayPayment(paymentId)
    if (payment.order_id !== orderId) return { ok: false, message: "We couldn't verify this payment." }
    // Authorized but not yet captured: the webhook will apply it once Razorpay captures it.
    if (payment.status !== "captured") return { ok: true, status: "pending" }
    const { data, error } = await supabase.rpc("app_apply_payment", {
      p_key: serverKey(),
      p_razorpay_order_id: orderId,
      p_razorpay_payment_id: paymentId,
      p_amount_paise: payment.amount,
    })
    if (error) throw new Error(error.message)
    if (data !== "applied" && data !== "already") {
      console.error("app_apply_payment:", data, orderId)
      return { ok: false, message: "Payment received but we couldn't apply it. We'll fix this; contact us with your payment ID." }
    }
    revalidatePath("/account")
    return { ok: true, status: "applied" }
  } catch (e) {
    console.error("confirmPayment failed:", e instanceof Error ? e.message : e)
    return { ok: true, status: "pending" }
  }
}
