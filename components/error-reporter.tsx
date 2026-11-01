"use client"

import { useEffect } from "react"

/** Sends uncaught browser errors to /api/client-error (max 5 per page load, no duplicates). */
export function ErrorReporter() {
  useEffect(() => {
    const seen = new Set<string>()
    const send = (message: string, detail?: string) => {
      if (!message || seen.size >= 5 || seen.has(message)) return
      // Extensions and cross-origin scripts produce noise we can't fix.
      if (/^Script error\.?$|ResizeObserver loop|extension:\/\//i.test(message + (detail ?? ""))) return
      seen.add(message)
      const body = JSON.stringify({ message: message.slice(0, 500), path: location.pathname, detail: detail?.slice(0, 3000) })
      try {
        navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" })) ||
          void fetch("/api/client-error", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } })
      } catch {}
    }
    const onError = (e: ErrorEvent) => send(e.message, e.error?.stack ?? `${e.filename}:${e.lineno}`)
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | undefined
      send(r?.message ? `Unhandled: ${r.message}` : `Unhandled rejection: ${String(e.reason).slice(0, 200)}`, r?.stack)
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
