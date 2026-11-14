import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Beta activity (closed beta B.3, migration 044): page visits from components/beta/activity-tracker.tsx on all three
// sites (one sign-in cookie for *.krpex.in). The database decides who is tracked (approved testers who agreed, while
// the beta is closed) and answers { track: false } to everyone else, so their browsers stop sending.

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("activity_tracking")
  if (error) console.error("activity_tracking failed:", error.message)
  return NextResponse.json({ track: data === true })
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 20000) return new NextResponse(null, { status: 413 })
  let views: unknown
  try {
    views = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (!Array.isArray(views)) return new NextResponse(null, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("activity_record", { p_views: views.slice(0, 50) })
  if (error) console.error("activity_record failed:", error.message)
  return NextResponse.json({ track: data === true })
}
