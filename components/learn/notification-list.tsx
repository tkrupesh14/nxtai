"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { NOTIFICATIONS_READ_EVENT, NotificationRow } from "@/components/learn/notifications"
import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/lib/notifications"

/** The /notifications page list. It refreshes by itself when a new one arrives (the bell refreshes the page). */
export function NotificationList({ items: initial }: { items: Notification[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [pending, start] = useTransition()
  useEffect(() => setItems(initial), [initial])

  const markRead = (ids: string[] | null) =>
    start(async () => {
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => (ids === null || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)))
      await createClient().rpc("mark_notifications_read", { p_ids: ids })
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT))
      router.refresh()
    })

  if (!items.length) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Nothing yet. We&apos;ll tell you here when something happens.</p>
  }
  const unread = items.filter((n) => !n.read_at).length
  return (
    <section aria-label="All notifications" className="grid gap-3">
      {unread > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{unread} unread</p>
          <Button size="sm" variant="outline" loading={pending} onClick={() => markRead(null)}>
            Mark all as read
          </Button>
        </div>
      )}
      <ul className="grid gap-0.5 rounded-xl border bg-card p-1.5">
        {items.map((n) => (
          <li key={n.id}>
            <NotificationRow n={n} onOpen={(x) => !x.read_at && markRead([x.id])} />
          </li>
        ))}
      </ul>
    </section>
  )
}
