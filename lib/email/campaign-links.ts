import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import { serverKey } from "@/lib/supabase/server-key"

const SITE = "https://krpex.in"
export const TOKEN = /^[0-9a-f]{32}$/

// Click links carry a signature so /api/email/c can't be used to send people to any site (an open redirect).
const sign = (token: string, url: string) => createHmac("sha256", serverKey()).update(`email-click\n${token}\n${url}`).digest("hex").slice(0, 24)

export function trackedLink(token: string, url: string) {
  return `${SITE}/api/email/c/${token}?u=${encodeURIComponent(url)}&s=${sign(token, url)}`
}

export function linkSignatureOk(token: string, url: string, signature: string | null) {
  if (!signature || !TOKEN.test(token)) return false
  const a = Buffer.from(sign(token, url))
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}
