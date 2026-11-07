import type { Metadata } from "next"
import Link from "next/link"

import { NotificationList } from "@/components/learn/notification-list"
import { NOTIFICATION_COLUMNS, type Notification } from "@/lib/notifications"
import { getCurrentProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Notifications — Krpex" }

export default async function NotificationsPage() {
  await getCurrentProfile()
  const supabase = await createClient()
  const { data } = await supabase.from("notifications").select(NOTIFICATION_COLUMNS).order("created_at", { ascending: false }).limit(100)
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-10 md:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The last 90 days. New ones also pop up while you&apos;re on Krpex, and ones you miss are emailed to you.{" "}
          <Link href="/account/settings#push" className="text-primary hover:underline">
            Get them on your phone
          </Link>{" "}
          ·{" "}
          <Link href="/account/settings#email" className="text-primary hover:underline">
            Email settings
          </Link>
        </p>
      </div>
      <NotificationList items={(data ?? []) as Notification[]} />
    </main>
  )
}
