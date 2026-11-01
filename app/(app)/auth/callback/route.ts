import { NextResponse, type NextRequest } from "next/server"

import { publicOrigin } from "@/lib/request-origin"
import { safeNext } from "@/lib/safe-next"
import { ensureProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

// Return URL for OAuth (GitHub / Google) and email links (sign-up confirmation, password reset):
// exchange the auth code for a session cookie. `flow` picks the error message on failure.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // First OAuth sign-in: create the profile row the dashboard reads.
      if (data.user) await ensureProfile(supabase, data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  const flow = searchParams.get("flow")
  const error = flow === "signup" ? "signup_link" : flow === "reset" ? "reset_link" : "oauth"
  return NextResponse.redirect(`${origin}/login?error=${error}`)
}
