import { NextResponse, type NextRequest } from "next/server"

import { linkSignatureOk } from "@/lib/email/campaign-links"
import { trackEmail } from "@/lib/email/campaign-server"

// A tracked link from a campaign email: record the click, then go where the link pointed. Only links we
// signed when sending are followed, so this can't be used to send people to other sites.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const url = request.nextUrl.searchParams.get("u") ?? ""
  if (!/^https?:\/\//.test(url) || !linkSignatureOk(token, url, request.nextUrl.searchParams.get("s"))) {
    return NextResponse.redirect("https://krpex.in/", 302)
  }
  await trackEmail(token, "click")
  return NextResponse.redirect(url, 302)
}
