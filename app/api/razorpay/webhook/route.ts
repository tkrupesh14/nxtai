import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { verifyWebhookSignature } from "@/lib/payments/razorpay"
import { serverKey } from "@/lib/supabase/server-key"

// Razorpay webhook (events: payment.captured, order.paid). Applies the payment even if the learner closed
// the checkout before our callback ran. Safe to receive twice: app_apply_payment is idempotent.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 100_000) return NextResponse.json({ error: "too large" }, { status: 413 })
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "")) {
    console.warn("razorpay webhook: bad signature")
    return NextResponse.json({ error: "bad signature" }, { status: 400 })
  }

  let event: {
    event?: string
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } }
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }

  const payment = event.payload?.payment?.entity
  if (!["payment.captured", "order.paid"].includes(event.event ?? "") || !payment?.id || !payment.order_id) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // No learner session here: the server key authorises the call.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc("app_apply_payment", {
    p_key: serverKey(),
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_amount_paise: payment.amount ?? 0,
  })
  if (error) {
    console.error("razorpay webhook apply failed:", error.message)
    return NextResponse.json({ error: "retry" }, { status: 500 }) // Razorpay retries
  }
  if (data !== "applied" && data !== "already") console.error("razorpay webhook:", data, payment.order_id)
  return NextResponse.json({ ok: true, result: data })
}
