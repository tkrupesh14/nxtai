import { NextResponse, type NextRequest } from "next/server"

import { unsubscribeCampaign } from "@/lib/email/campaign-server"
import { publicOrigin } from "@/lib/request-origin"

// One-click unsubscribe from campaign emails (RFC 8058): mail apps POST here from their "Unsubscribe" button.
// A GET (a link scanner or preview) changes nothing and shows the page with a button instead.
export async function POST(request: NextRequest) {
  const result = await unsubscribeCampaign(request.nextUrl.searchParams.get("t"))
  if (result === "error") return NextResponse.json({ error: "retry" }, { status: 500 })
  return NextResponse.json({ ok: result === "ok" })
}

export function GET(request: NextRequest) {
  const url = new URL("/email/unsubscribe", publicOrigin(request))
  url.search = request.nextUrl.search
  return NextResponse.redirect(url, 303)
}
