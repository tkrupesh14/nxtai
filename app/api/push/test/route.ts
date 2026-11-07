import { NextResponse, type NextRequest } from "next/server"

import { pushConfigured } from "@/lib/push/send-pushes"
import { PUSH_ENDPOINT, sendPush } from "@/lib/push/webpush"
import { createClient } from "@/lib/supabase/server"

// "Send a test notification" (9.4): push straight to the device asking, and say what the push service answered.
// Only to a device saved for the signed-in person; at most one test every 10 seconds each.
const lastTest = new Map<string, number>()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: "Notifications aren't set up yet." }, { status: 503 })

  const now = Date.now()
  if (now - (lastTest.get(user.id) ?? 0) < 10_000) return NextResponse.json({ error: "Wait a few seconds and try again." }, { status: 429 })
  lastTest.set(user.id, now)

  let device: { endpoint?: unknown; p256dh?: unknown; auth?: unknown }
  try {
    device = await request.json()
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 })
  }
  const { endpoint, p256dh, auth } = device
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string" || !PUSH_ENDPOINT.test(endpoint)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 })
  }
  // Row-level security: only finds the device if it's saved for this person.
  const { data: saved } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle()
  if (!saved) return NextResponse.json({ error: "This device isn't turned on. Turn it off and on again." }, { status: 404 })

  try {
    const result = await sendPush(
      { endpoint, p256dh, auth },
      { title: "Test notification", body: "Notifications work on this device.", url: "/account/settings#push", tag: "krpex-test" },
      { publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY!, subject: "mailto:info@krpex.in" },
    )
    return NextResponse.json({ ok: result.ok, status: result.status, gone: result.gone })
  } catch (e) {
    console.error("push test failed:", e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, status: 0 })
  }
}
