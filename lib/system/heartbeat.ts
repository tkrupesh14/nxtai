import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { serverKey } from "@/lib/supabase/server-key"
import { checkDatabase } from "@/lib/system/health"

// Admin 6.6 (migration 040): record each start of the production server with the commit it was built from
// (scripts/deploy.sh writes krpex-build.json into the build), then every 5 minutes whether it can reach Supabase,
// how long that took and how much memory the server uses. Checks that can't be saved (e.g. Supabase is down)
// are kept, up to 100, and sent with the next one. Started once from instrumentation.ts.

type Build = { commit?: string; subject?: string; built_at?: string; dirty?: boolean }
type Check = { p_at: string; p_ok: boolean; p_database: string; p_ms: number; p_rss_mb: number }

function readBuild(): Build {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), process.env.NEXT_DIST_DIR || ".next", "krpex-build.json"), "utf8")) as Build
  } catch {
    return {}
  }
}

export function startHeartbeat() {
  const g = globalThis as { __krpexHeartbeat?: boolean }
  if (g.__krpexHeartbeat) return
  g.__krpexHeartbeat = true

  const build = readBuild()
  const commit = typeof build.commit === "string" ? build.commit.slice(0, 40) : null
  const client: SupabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Never let logging stop the server starting (e.g. SERVER_RPC_KEY missing).
  let key: string
  try {
    key = serverKey()
  } catch (e) {
    console.error("heartbeat off:", e instanceof Error ? e.message : e)
    return
  }

  void client
    .rpc("app_log_start", {
      p_key: key,
      p_commit: commit,
      p_subject: typeof build.subject === "string" ? build.subject.slice(0, 200) : null,
      p_built_at: build.built_at ?? null,
      p_dirty: build.dirty === true,
    })
    .then(({ error }) => error && console.error("start log failed:", error.message), (e) => console.error("start log failed:", e instanceof Error ? e.message : e))

  const pending: Check[] = []
  const beat = async () => {
    try {
      const { ok, database, ms } = await checkDatabase()
      pending.push({ p_at: new Date().toISOString(), p_ok: ok, p_database: database, p_ms: ms, p_rss_mb: Math.round(process.memoryUsage().rss / 1048576) })
      if (pending.length > 100) pending.splice(0, pending.length - 100)
      while (pending.length) {
        const { error } = await client.rpc("app_log_health", { p_key: key, p_commit: commit, ...pending[0] })
        if (error) break
        pending.shift()
      }
    } catch (e) {
      console.error("heartbeat failed:", e instanceof Error ? e.message : e)
    }
  }
  setTimeout(() => void beat(), 60_000).unref()
  setInterval(() => void beat(), 5 * 60_000).unref()
}
