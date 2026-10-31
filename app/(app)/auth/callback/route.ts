import { NextResponse, type NextRequest } from "next/server"

import { publicOrigin } from "@/lib/request-origin"
import { ensureProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

// OAuth (GitHub / Google) return URL: exchange the auth code for a session cookie.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get("code")
  const nextParam = searchParams.get("next") ?? "/learn"
  // Only allow same-site relative redirects.
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/learn"

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // First OAuth sign-in: create the profile row the dashboard reads.
      if (data.user) await ensureProfile(supabase, data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
