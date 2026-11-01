import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { serverKey } from "@/lib/supabase/server-key"

let client: SupabaseClient | null = null

/** Record an AI call's token usage for the admin page (fire and forget; never blocks or fails the caller). */
export function logAiUsage(kind: string, usage: { input: number; output: number }) {
  try {
    client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    void client
      .rpc("app_log_ai_usage", { p_key: serverKey(), p_kind: kind, p_in: usage.input, p_out: usage.output })
      .then(({ error }) => error && console.error("ai usage log failed:", error.message))
  } catch (e) {
    console.error("ai usage log failed:", e instanceof Error ? e.message : e)
  }
}
