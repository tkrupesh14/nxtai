"use client"

import { useState } from "react"

import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/client"

type Provider = "github" | "google"

// Supabase OAuth sign-in. After the provider redirects back, /auth/callback
// exchanges the code for a session and sends the user to `next` (default /dashboard).
export function OAuthButtons({ next = "/dashboard" }: { next?: string }) {
  const [pending, setPending] = useState<Provider | null>(null)

  async function signIn(provider: Provider) {
    setPending(provider)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
      if (error) throw error
    } catch (e) {
      console.error("OAuth sign-in failed:", e instanceof Error ? e.message : e)
      setPending(null)
    }
  }

  return (
    <div className="grid gap-3">
      <Button variant="outline" onClick={() => signIn("github")} disabled={pending !== null} className="w-full">
        {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
      </Button>
      <Button variant="outline" onClick={() => signIn("google")} disabled={pending !== null} className="w-full">
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
    </div>
  )
}
