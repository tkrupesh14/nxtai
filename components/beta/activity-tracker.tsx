"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

import type { FeedbackSite } from "@/lib/feedback/options"
import { createClient } from "@/lib/supabase/client"

type View = { site: FeedbackSite; path: string; came_from: string | null; started_at: string; seconds: number }
type Visit = { path: string; came_from: string | null; started_at: string; visibleMs: number; since: number | null }

const KEY = "krpex-activity" // "on", or "off:<time>" for this tab and site
const RECHECK_MS = 15 * 60_000 // ask again after 15 minutes, e.g. someone approved while the tab was open
const ENDPOINT = "/api/beta/activity"

function remembered(): "on" | "off" | null {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v === "on") return "on"
    return v?.startsWith("off:") && Date.now() - Number(v.slice(4)) < RECHECK_MS ? "off" : null
  } catch {
    return null
  }
}
function remember(v: "on" | "off") {
  try {
    sessionStorage.setItem(KEY, v === "on" ? "on" : `off:${Date.now()}`)
  } catch {}
}

/** Where the first page of a visit came from: the path on a Krpex site, or another site's host name. */
function referrerPath() {
  try {
    if (!document.referrer) return null
    const r = new URL(document.referrer)
    return /(^|\.)krpex\.in$/.test(r.hostname) || r.host === location.host ? r.pathname : r.hostname
  } catch {
    return null
  }
}

/**
 * Beta activity (closed beta B.3): which pages a tester visits and for how long (time with the tab visible), sent in
 * batches to /api/beta/activity. Nothing is sent for visitors who aren't signed in; for accounts that aren't tracked
 * the server says so and this tab stays quiet for 15 minutes before asking again. Only the path is sent, never the query string.
 * Leaving the tab ends the current visit (so it isn't lost on phones); coming back starts a new one on the same page.
 */
export function ActivityTracker({ site }: { site: FeedbackSite }) {
  const pathname = usePathname()
  const status = useRef<"unknown" | "on" | "off">("unknown")
  const queue = useRef<View[]>([])
  const visit = useRef<Visit | null>(null)
  const away = useRef<string | null>(null) // the page the tab was hidden on

  const send = (beacon: boolean) => {
    if (status.current !== "on" || queue.current.length === 0) return
    const body = JSON.stringify(queue.current.splice(0, 50))
    if (beacon && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } })
      .then((r) => r.json() as Promise<{ track?: boolean }>)
      .then((r) => {
        if (r.track === false) (status.current = "off"), remember("off")
      })
      .catch(() => {})
  }
  const finish = () => {
    const v = visit.current
    visit.current = null
    if (!v || status.current === "off") return
    const ms = v.visibleMs + (v.since === null ? 0 : Date.now() - v.since)
    queue.current.push({ site, path: v.path, came_from: v.came_from, started_at: v.started_at, seconds: Math.round(ms / 1000) })
  }
  const start = (path: string, came_from: string | null) => {
    visit.current = { path, came_from, started_at: new Date().toISOString(), visibleMs: 0, since: document.visibilityState === "visible" ? Date.now() : null }
  }

  // Ask once per tab whether this account is tracked; follow the tab being hidden and shown.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "visible") {
        if (!visit.current && away.current) start(away.current, away.current)
        away.current = null
        return
      }
      if (visit.current) away.current = visit.current.path
      finish()
      send(true)
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onHide)

    const known = remembered()
    if (known === "off") status.current = "off"
    else
      void createClient()
        .auth.getSession()
        .then(async ({ data }) => {
          if (!data.session) return void (status.current = "off")
          if (known !== "on") {
            const r = await fetch(ENDPOINT)
              .then((x) => x.json() as Promise<{ track?: boolean }>)
              .catch(() => null)
            if (!r) return
            remember(r.track ? "on" : "off")
            if (!r.track) return void (status.current = "off")
          }
          status.current = "on"
        })
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onHide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Each page change ends one visit and starts the next.
  useEffect(() => {
    if (status.current === "off") return
    const path = window.location.pathname
    if (visit.current?.path === path) return
    const from = visit.current?.path ?? queue.current.at(-1)?.path ?? referrerPath()
    finish()
    start(path, from)
    if (queue.current.length >= 10) send(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
