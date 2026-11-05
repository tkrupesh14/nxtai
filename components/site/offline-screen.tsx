"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/site/ui/button"

export function OfflineMessage({ onRetry, retrying, children }: { onRetry: () => void; retrying?: boolean; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-7" aria-hidden>
          <path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.3-1.6M1.4 9a15 15 0 0 1 4.4-2.7M22.6 9A15 15 0 0 0 11 5.1" />
          <circle cx="12" cy="20" r="0.6" fill="currentColor" />
        </svg>
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 text-muted-foreground">
        Krpex can&apos;t reach the internet. Check your Wi-Fi or mobile data. Your progress is saved, so you can pick up where
        you left off.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry} loading={retrying}>
          {retrying ? "Checking…" : "Try again"}
        </Button>
        {children}
      </div>
    </div>
  )
}

/**
 * Covers the page when the connection drops, and goes away by itself when it's back. Also registers the service
 * worker (public/sw.js) that shows public/offline.html when a full page load fails offline.
 */
export function OfflineScreen() {
  const router = useRouter()
  const [offline, setOffline] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine)
      if (navigator.onLine) setDismissed(false)
    }
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  const retry = async () => {
    setRetrying(true)
    try {
      const res = await fetch("/api/health", { cache: "no-store" })
      if (res.ok) {
        setOffline(false)
        router.refresh()
      }
    } catch {
      setOffline(true)
    } finally {
      setRetrying(false)
    }
  }

  if (!offline) return null
  if (dismissed) {
    return (
      <div role="status" className="fixed inset-x-0 bottom-0 z-[90] border-t bg-foreground px-4 py-2.5 text-center text-sm text-background">
        You&apos;re offline. Some things won&apos;t work until you reconnect.
      </div>
    )
  }
  return (
    <div role="alertdialog" aria-modal="true" aria-label="You're offline" className="fixed inset-0 z-[90] flex items-center bg-background/95 backdrop-blur-sm">
      <OfflineMessage onRetry={retry} retrying={retrying}>
        <Button variant="outline" onClick={() => setDismissed(true)}>
          Keep reading this page
        </Button>
      </OfflineMessage>
    </div>
  )
}
