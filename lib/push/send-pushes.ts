import "server-only"

import { createClient } from "@supabase/supabase-js"

import { logError } from "@/lib/error-log"
import { safeLink } from "@/lib/notifications"
import { sendPush, type PushDevice } from "@/lib/push/webpush"
import { serverKey } from "@/lib/supabase/server-key"

type Taken = { id: string; title: string; body: string | null; link: string | null; devices: PushDevice[] }

/** VAPID keys from the environment (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). Never log them. */
export function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let running = false

/** One pass: push each new notification to its owner's devices (migration 025). Returns pushes sent. */
export async function sendPushes(): Promise<number> {
  if (running || !pushConfigured()) return 0
  running = true
  let sent = 0
  try {
    const keys = {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
      subject: "mailto:info@krpex.in",
    }
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc("app_take_pushes", { p_key: serverKey() })
    if (error) throw new Error(`take: ${error.message}`)
    for (const n of (data ?? []) as Taken[]) {
      const message = { title: n.title, body: n.body ?? "", url: safeLink(n.link) ?? "/notifications", tag: n.id }
      for (const device of n.devices ?? []) {
        let result = { ok: false, gone: false, status: 0 }
        try {
          result = await sendPush(device, message, keys)
        } catch (e) {
          logError("server", `push failed: ${e instanceof Error ? e.message : e}`, "push")
        }
        if (result.ok) sent++
        else if (!result.gone && result.status) logError("server", `push rejected: HTTP ${result.status}`, "push")
        const { error: resultError } = await supabase.rpc("app_push_result", {
          p_key: serverKey(),
          p_endpoint: device.endpoint,
          p_ok: result.ok,
          p_gone: result.gone,
        })
        if (resultError) logError("server", `push result failed: ${resultError.message}`, "push")
      }
    }
  } catch (e) {
    logError("server", `pushes: ${e instanceof Error ? e.message : e}`, "push")
  } finally {
    running = false
  }
  return sent
}
