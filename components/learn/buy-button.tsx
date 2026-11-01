"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { confirmPayment, createOrder } from "@/app/(learn)/account/billing-actions"
import { Button } from "@/components/site/ui/button"

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void }
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

let checkoutLoading: Promise<void> | null = null
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  checkoutLoading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve()
    s.onerror = () => {
      checkoutLoading = null
      reject(new Error("checkout script failed"))
    }
    document.body.appendChild(s)
  })
  return checkoutLoading
}

/** Buy a product with Razorpay Checkout; credits / Pro are added once the payment is verified on the server. */
export function BuyButton({
  productId,
  label,
  variant = "outline",
}: {
  productId: string
  label: string
  variant?: "default" | "outline"
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null)

  async function buy() {
    setBusy(true)
    setMessage(null)
    try {
      const [order] = await Promise.all([createOrder(productId), loadCheckout()])
      if (!order.ok) {
        setMessage({ tone: "error", text: order.message })
        setBusy(false)
        return
      }
      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: "INR",
        name: "NxtAI",
        description: order.description,
        prefill: { name: order.name, email: order.email },
        theme: { color: "#3b82f6" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (r: RazorpayResponse) => {
          setMessage({ tone: "info", text: "Payment received. Confirming…" })
          const res = await confirmPayment(r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature)
          setBusy(false)
          if (!res.ok) return setMessage({ tone: "error", text: res.message })
          setMessage(
            res.status === "applied"
              ? { tone: "ok", text: "Done! Your purchase has been added." }
              : { tone: "info", text: "Payment received. It will appear here within a few minutes." },
          )
          router.refresh()
        },
      })
      rzp.on("payment.failed", (r) => {
        setMessage({ tone: "error", text: r.error?.description || "The payment failed. You haven't been charged." })
        setBusy(false)
      })
      rzp.open()
    } catch {
      setMessage({ tone: "error", text: "Couldn't open the payment window. Check your connection and try again." })
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant={variant} size="sm" className="w-full" onClick={buy} disabled={busy}>
        {busy ? "Please wait…" : label}
      </Button>
      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={
            message.tone === "error"
              ? "text-xs text-destructive-foreground"
              : message.tone === "ok"
                ? "text-xs text-green-700 dark:text-green-400"
                : "text-xs text-muted-foreground"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
