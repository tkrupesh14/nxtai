import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { createClient as createRequestClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

let anon: SupabaseClient | null = null

/**
 * Record an AI call's token usage and model for the admin pages (fire and forget; never blocks or fails the caller).
 * Inside a signed-in request it goes with the learner's session, so the database records who it was for (auth.uid()).
 */
export function logAiUsage(kind: string, usage: { input: number; output: number }, model?: string) {
  const args = { p_key: serverKey(), p_kind: kind, p_in: usage.input, p_out: usage.output, p_model: model ?? null }
  void (async () => {
    let client: SupabaseClient
    try {
      client = (await createRequestClient()) as unknown as SupabaseClient
    } catch {
      anon ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      client = anon
    }
    const { error } = await client.rpc("app_log_ai_usage", args)
    if (error) console.error("ai usage log failed:", error.message)
  })().catch((e) => console.error("ai usage log failed:", e instanceof Error ? e.message : e))
}
