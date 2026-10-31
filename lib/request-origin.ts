import type { NextRequest } from "next/server"

/**
 * Public origin of the request. Behind Nginx, `request.url` is the internal
 * address (http://localhost:3000), so prefer the Host / X-Forwarded-* headers
 * that Nginx passes through.
 */
export function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!host) return request.nextUrl.origin
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || request.nextUrl.protocol.replace(":", "")
  return `${proto}://${host}`
}
