import "server-only"

import { createClient } from "@supabase/supabase-js"

import { logError } from "@/lib/error-log"
import { serverKey } from "@/lib/supabase/server-key"

/** 7 pm in India. The database makes at most one of each reminder per person per day, so running twice is safe. */
export function isReminderHour(now = new Date()) {
  const ist = new Date(now.getTime() + 330 * 60_000)
  return ist.getUTCHours() === 19
}

/** 9.5: create today's study reminders (migration 025). Returns how many were made. */
export async function createReminders(): Promise<number> {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc("app_create_reminders", { p_key: serverKey() })
    if (error) throw new Error(error.message)
    return (data as number) ?? 0
  } catch (e) {
    logError("server", `reminders: ${e instanceof Error ? e.message : e}`, "reminders")
    return 0
  }
}
