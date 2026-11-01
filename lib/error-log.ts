import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { serverKey } from "@/lib/supabase/server-key"

let client: SupabaseClient | null = null

/** Record an error for the admin page (fire and forget; never throws). */
export function logError(source: "server" | "client", message: string, path?: string | null, detail?: string | null) {
  try {
    client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    void client
      .rpc("app_log_error", {
        p_key: serverKey(),
        p_source: source,
        p_message: message.slice(0, 1000),
        p_path: path?.slice(0, 300) ?? null,
        p_detail: detail?.slice(0, 4000) ?? null,
      })
      .then(({ error }) => error && console.error("error log failed:", error.message))
  } catch {}
}
