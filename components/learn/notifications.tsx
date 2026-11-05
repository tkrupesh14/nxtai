"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mergeNotifications, NOTIFICATION_COLUMNS, safeLink, timeAgo, type Notification } from "@/lib/notifications"
import { cn } from "@/lib/utils"

const POLL_MS = 60_000 // only while the live connection is down
const AWAY_MS = 30_000 // coming back to a tab after this long refreshes it
const TOAST_MS = 7_000
/** Fired on window when notifications are marked read outside the bell (the /notifications page). */
export const NOTIFICATIONS_READ_EVENT = "krpex:notifications-read"

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  )
}

/** One notification in the bell's list or on /notifications. */
export function NotificationRow({ n, onOpen }: { n: Notification; onOpen?: (n: Notification) => void }) {
  const href = safeLink(n.link)
  const inner = (
    <>
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-hidden />
      <span className="grid min-w-0 gap-0.5">
        <span className={cn("text-sm leading-snug break-words", !n.read_at && "font-medium")}>
          {n.title}
          {!n.read_at && <span className="sr-only"> (unread)</span>}
        </span>
        {n.body ? <span className="line-clamp-2 text-xs break-words text-muted-foreground">{n.body}</span> : null}
        <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
      </span>
    </>
  )
  const cls = "flex w-full gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
  return href ? (
    <Link href={href} className={cls} onClick={() => onOpen?.(n)}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={() => onOpen?.(n)}>
      {inner}
    </button>
  )
}

/**
 * The bell in the header, and live updates for the whole signed-in app: each tab listens to its own notifications
 * over Supabase Realtime, shows new ones, and refreshes the data on screen (an answered question, a new inbox item).
 * If the live connection drops it checks every minute instead, and it also refreshes a tab you come back to.
 */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(initialUnread)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<Notification | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const seen = useRef<Set<string> | null>(null) // ids already known; null until the first load
  const refreshTimer = useRef<number | undefined>(undefined)
  const toastTimer = useRef<number | undefined>(undefined)
  const staleWhileHidden = useRef(false)

  // The header is re-rendered by the server on refresh: take its count.
  useEffect(() => setUnread(initialUnread), [initialUnread])
  useEffect(() => setOpen(false), [pathname])

  const fetchLatest = useCallback(async () => {
    const [{ data }, { count }] = await Promise.all([
      supabase.from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).limit(20),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ])
    return { list: (data ?? []) as Notification[], count: typeof count === "number" ? count : null }
  }, [supabase])

  const refreshPage = useCallback(() => {
    if (document.visibilityState !== "visible") {
      staleWhileHidden.current = true
      return
    }
    window.clearTimeout(refreshTimer.current)
    refreshTimer.current = window.setTimeout(() => router.refresh(), 300)
  }, [router])

  /** New notifications arrived (live, or found by a check): list, count, pop-up, and fresh data on screen. */
  const arrive = useCallback(
    (incoming: Notification[], count: number | null) => {
      const known = seen.current
      if (!known) return
      const fresh = incoming.filter((n) => !known.has(n.id))
      if (!fresh.length) return
      fresh.forEach((n) => known.add(n.id))
      setItems((prev) => (prev ? mergeNotifications(prev, fresh) : prev))
      if (count !== null) setUnread(count)
      else setUnread((u) => u + fresh.filter((n) => !n.read_at).length)
      const latest = fresh.reduce((a, b) => (b.created_at > a.created_at ? b : a))
      setToast(latest)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
      refreshPage()
    },
    [refreshPage],
  )

  const check = useCallback(async () => {
    const { list, count } = await fetchLatest()
    if (!seen.current) {
      seen.current = new Set(list.map((n) => n.id))
      setItems(list)
      if (count !== null) setUnread(count)
      return
    }
    arrive(list, count)
  }, [arrive, fetchLatest])

  // Live connection, with a once-a-minute check while it is down.
  useEffect(() => {
    let poll: number | undefined
    let stopped = false
    void check()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          // The row is complete, but the unread count may have changed in other ways (a replaced notification).
          const n = payload.new as Notification
          void supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .is("read_at", null)
            .then(({ count }) => arrive([n], typeof count === "number" ? count : null))
        },
      )
      .subscribe((status) => {
        if (stopped) return
        if (status === "SUBSCRIBED") {
          window.clearInterval(poll)
          poll = undefined
          void check() // anything that arrived while connecting
        } else if (!poll) {
          poll = window.setInterval(() => void check(), POLL_MS)
        }
      })
    return () => {
      stopped = true
      window.clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [arrive, check, supabase, userId])

  // Marked read elsewhere (the /notifications page): count again.
  useEffect(() => {
    const onRead = () =>
      void fetchLatest().then(({ list, count }) => {
        if (seen.current) list.forEach((n) => seen.current!.add(n.id))
        setItems((prev) => (prev ? list : prev))
        if (count !== null) setUnread(count)
      })
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead)
    return () => window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead)
  }, [fetchLatest])

  // Coming back to the tab: catch up.
  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now()
        return
      }
      const away = hiddenAt && Date.now() - hiddenAt > AWAY_MS
      if (staleWhileHidden.current || away) {
        staleWhileHidden.current = false
        void check()
        router.refresh()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [check, router])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function markRead(ids: string[] | null) {
    const now = new Date().toISOString()
    setItems((prev) => prev?.map((n) => (ids === null || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)) ?? prev)
    const { data } = await supabase.rpc("mark_notifications_read", { p_ids: ids })
    if (typeof data === "number") setUnread(data)
  }

  const onOpen = (n: Notification) => {
    setOpen(false)
    setToast(null)
    if (!n.read_at) void markRead([n.id])
  }

  const badge = unread > 9 ? "9+" : String(unread)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          if (!items) void check()
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BellIcon className="size-[18px]" />
        {unread > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-primary px-1 text-center text-[10px] leading-[18px] font-semibold text-primary-foreground"
            aria-hidden
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-2 top-14 z-50 grid max-h-[min(32rem,calc(100dvh-5rem))] grid-rows-[auto_1fr_auto] rounded-xl border bg-popover text-popover-foreground shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={() => void markRead(null)} className="text-xs font-medium text-primary hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto p-1.5">
            {items === null ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing yet. We&apos;ll tell you here when something happens.</p>
            ) : (
              <ul className="grid gap-0.5">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationRow n={n} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t px-4 py-2 text-center">
            <Link href="/notifications" className="text-xs font-medium text-primary hover:underline">
              See all notifications
            </Link>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed top-16 right-2 left-2 z-[60] flex justify-end sm:left-auto sm:w-96" role="status" aria-live="polite">
        {toast && (
          <div className="pointer-events-auto flex w-full items-start gap-1 rounded-xl border bg-popover text-popover-foreground shadow-lg">
            <div className="min-w-0 flex-1 p-1">
              <NotificationRow n={toast} onOpen={onOpen} />
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="m-1.5 rounded-md px-2 py-1 text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
