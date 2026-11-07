import "server-only"

import { createClient } from "@supabase/supabase-js"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Turn notification emails off for whoever owns this token (from an email link). "ok", "unknown" or "error". */
export async function unsubscribe(token: unknown): Promise<"ok" | "unknown" | "error"> {
  if (typeof token !== "string" || !UUID.test(token)) return "unknown"
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.rpc("unsubscribe_notification_emails", { p_token: token })
  if (error) {
    console.error("unsubscribe failed:", error.message)
    return "error"
  }
  return data ? "ok" : "unknown"
}
