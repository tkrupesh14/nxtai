import { NextResponse, type NextRequest } from "next/server"

import { unsubscribe } from "@/lib/email/unsubscribe"
import { publicOrigin } from "@/lib/request-origin"

// One-click unsubscribe (RFC 8058): mail apps POST here when someone presses their "Unsubscribe" button.
// A GET (a link scanner, a preview) changes nothing; people who click the link land on /unsubscribe instead.
export async function POST(request: NextRequest) {
  const result = await unsubscribe(request.nextUrl.searchParams.get("t"))
  if (result === "error") return NextResponse.json({ error: "retry" }, { status: 500 })
  return NextResponse.json({ ok: result === "ok" })
}

export function GET(request: NextRequest) {
  const url = new URL("/unsubscribe", publicOrigin(request))
  url.search = request.nextUrl.search
  return NextResponse.redirect(url, 303)
}
