import { NextResponse, type NextRequest } from "next/server"

import { logError } from "@/lib/error-log"

// Browser error reports (see components/error-reporter.tsx). Small, capped, and never echoed back.
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 8000) return new NextResponse(null, { status: 413 })
  let body: { message?: unknown; path?: unknown; detail?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) return new NextResponse(null, { status: 400 })
  const path = typeof body.path === "string" ? body.path : null
  const detail = typeof body.detail === "string" ? body.detail : null
  logError("client", message, path, [detail, request.headers.get("user-agent")].filter(Boolean).join("\nUA: "))
  return new NextResponse(null, { status: 204 })
}
