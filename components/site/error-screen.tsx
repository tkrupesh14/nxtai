"use client"

import { useEffect, useState } from "react"

import { OfflineMessage } from "@/components/site/offline-screen"
import { Button } from "@/components/site/ui/button"

/** The error boundary page: the offline page when the connection is the problem, otherwise "Something went wrong". */
export function ErrorScreen({ reset }: { reset: () => void }) {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (offline) {
    return (
      <main className="py-24">
        <OfflineMessage onRetry={() => navigator.onLine && reset()} />
      </main>
    )
  }
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        An unexpected error happened while loading this page. If your connection is slow, try again in a moment.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => location.reload()}>
          Reload the page
        </Button>
      </div>
    </main>
  )
}
