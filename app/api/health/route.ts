import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Uptime check: the app is serving and can reach Supabase. Returns no private data.
export async function GET() {
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
  const ok = database === "ok"
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", database, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  )
}
