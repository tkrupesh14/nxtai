"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/client"

type State = "loading" | "unsupported" | "ios-install" | "blocked" | "off" | "on" | "unconfigured"

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function keyBytes(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4)
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function registration() {
  await navigator.serviceWorker.register("/sw.js")
  return navigator.serviceWorker.ready
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  const { error } = await createClient().rpc("save_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? "",
    p_auth: json.keys?.auth ?? "",
  })
  if (error) throw new Error(error.message)
}

/** 9.4: turn push notifications on or off for this phone or browser. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      if (!VAPID) return setState("unconfigured")
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
      const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !installed ? "ios-install" : "unsupported")
      }
      if (Notification.permission === "denied") return setState("blocked")
      try {
        const sub = await (await registration()).pushManager.getSubscription()
        if (sub) await save(sub).catch(() => {}) // keeps this device linked to whoever is signed in now
        setState(sub ? "on" : "off")
      } catch {
        setState("unsupported")
      }
    })()
  }, [])

  async function turnOn() {
    setBusy(true)
    setError(null)
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked")
      const reg = await registration()
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }))
      await save(sub)
      setState("on")
    } catch {
      setError("Couldn't turn on notifications on this device. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const [test, setTest] = useState<string | null>(null)

  /** Push to this device now and report what happened, step by step. */
  async function sendTest() {
    setBusy(true)
    setError(null)
    setTest("Sending…")
    try {
      const sub = await (await registration()).pushManager.getSubscription()
      if (!sub) {
        setState("off")
        return setTest(null)
      }
      const received = new Promise<boolean>((resolve) => {
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type === "krpex-push" && e.data.tag === "krpex-test") {
            navigator.serviceWorker.removeEventListener("message", onMessage)
            resolve(true)
          }
        }
        navigator.serviceWorker.addEventListener("message", onMessage)
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", onMessage)
          resolve(false)
        }, 20_000)
      })
      const json = sub.toJSON()
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
      })
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: number; error?: string }
      if (!res.ok || out.error) return setTest(out.error ?? "Couldn't send a test. Please try again.")
      if (!out.ok) return setTest(`The push service didn't accept it (code ${out.status ?? "none"}). Turn notifications off and on again.`)
      setTest("Sent. Waiting for this device…")
      setTest(
        (await received)
          ? "This device received it. If you didn't see a notification, check Do Not Disturb and Chrome's notification settings."
          : "The push service accepted it, but this device hasn't received it yet. Keep Chrome allowed to run in the background, and check your connection.",
      )
    } catch {
      setTest("Couldn't send a test. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    setError(null)
    try {
      const sub = await (await registration()).pushManager.getSubscription()
      if (sub) {
        await createClient().rpc("delete_push_subscription", { p_endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setState("off")
    } catch {
      setError("Couldn't turn off notifications. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const note: Partial<Record<State, string>> = {
    loading: "Checking this device…",
    unsupported: "This browser can't show notifications from websites.",
    "ios-install":
      "On iPhone and iPad, first add Krpex to your Home Screen (Share → Add to Home Screen), open it from there, and turn notifications on here.",
    blocked: "Notifications from krpex.in are blocked. Allow them in your browser's site settings, then reload this page.",
    unconfigured: "Not available yet.",
  }

  return (
    <div className="grid gap-3">
      {state === "on" || state === "off" ? (
        <div className="flex flex-wrap items-center gap-3">
          {state === "on" ? (
            <>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">On for this device</span>
              <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={busy}>
                Send a test notification
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={turnOff} disabled={busy}>
                Turn off
              </Button>
            </>
          ) : (
            <Button type="button" onClick={turnOn} disabled={busy} loading={busy}>
              Turn on for this device
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" role={state === "blocked" ? "alert" : undefined}>
          {note[state]}
        </p>
      )}
      {test ? (
        <p role="status" className="text-sm text-muted-foreground">
          {test}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}
    </div>
  )
}
