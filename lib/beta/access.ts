import "server-only"

import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { mainHref, requestHost } from "@/lib/code-host"
import type { BetaStatus } from "@/lib/beta/options"
import { createClient } from "@/lib/supabase/server"

// Closed beta (plan.md "Closed beta", migration 041). The database refuses writes and community reading
// without access; these checks send people to krpex.in/beta instead of showing them empty pages.

export type { BetaApplication, BetaDevice, BetaRole, BetaStatus } from "@/lib/beta/options"

/** This visitor's beta status, once per request. If the database can't be reached, lets them through: the database still guards everything that matters. */
export const getBetaStatus = cache(async (): Promise<BetaStatus> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("beta_my_status")
  if (error || !data) {
    console.error("beta_my_status failed:", error?.message)
    return { closed: false, signed_in: true, access: true, beta_tester: false, application: null }
  }
  return data as BetaStatus
})

/**
 * Send visitors without beta access to krpex.in/beta, which brings them back to `from` (a path as served here:
 * "/learn", "/code/problems", "/community/c") once they're in. With `signedOut: "allow"`, signed-out visitors
 * pass, for pages that send them to log in first.
 */
export async function requireBeta(from: string, opts: { signedOut?: "allow" | "beta" } = {}) {
  const s = await getBetaStatus()
  if (s.access || (!s.signed_in && opts.signedOut === "allow")) return
  redirect(mainHref(`/beta?from=${encodeURIComponent(from)}`, requestHost(await headers())))
}
