import "server-only"

/** Can the server reach Supabase? Used by /api/health and the heartbeat (lib/system/heartbeat.ts). */
export async function checkDatabase(): Promise<{ ok: boolean; database: string; ms: number }> {
  const started = Date.now()
  let database = "ok"
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (!res.ok) database = `error ${res.status}`
  } catch {
    database = "unreachable"
  }
  return { ok: database === "ok", database, ms: Date.now() - started }
}
