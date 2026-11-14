import { NextResponse } from "next/server"

import { checkDatabase } from "@/lib/system/health"

export const dynamic = "force-dynamic"

// Uptime check: the app is serving and can reach Supabase. Returns no private data.
export async function GET() {
  const { ok, database, ms } = await checkDatabase()
  return NextResponse.json({ status: ok ? "ok" : "degraded", database, ms }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
