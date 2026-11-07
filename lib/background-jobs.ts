import "server-only"

import { emailConfigured } from "@/lib/email/send"
import { sendNotificationEmails } from "@/lib/email/notification-emails"
import { pushConfigured, sendPushes } from "@/lib/push/send-pushes"
import { createReminders, isReminderHour, applyStreakFreezes } from "@/lib/reminders"

/**
 * Work the production server does on its own (started once from instrumentation.ts):
 * push new notifications every minute (9.4), email unseen ones every 5 minutes (9.3) and create study
 * reminders at 7 pm IST (9.5), and use streak freezes for missed days every 10 minutes (5.7b).
 * Each pass logs one line with counts only, never addresses.
 */
export function startBackgroundJobs() {
  const g = globalThis as { __krpexJobs?: boolean }
  if (g.__krpexJobs) return
  g.__krpexJobs = true

  const log = (what: string, n: number) => {
    if (n > 0) console.log(`jobs: ${what} ${n}`)
  }
  if (!emailConfigured()) console.warn("jobs: SMTP_USER / SMTP_PASSWORD not set, not sending emails")
  if (!pushConfigured()) console.warn("jobs: VAPID keys not set, not sending pushes")

  let tick = 0
  const run = async () => {
    tick++
    log("pushes sent", await sendPushes())
    if (tick % 5 === 1) log("emails sent", await sendNotificationEmails())
    if (tick % 10 === 1) log("streak freezes used", await applyStreakFreezes())
    if (tick % 10 === 1 && isReminderHour()) {
      log("reminders created", await createReminders())
      log("pushes sent", await sendPushes()) // reminders reach phones straight away
    }
  }
  setTimeout(() => void run(), 30_000).unref()
  setInterval(() => void run(), 60_000).unref()
}
