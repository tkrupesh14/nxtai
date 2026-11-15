"use client"

import { useState } from "react"

import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/client"

type Provider = "github" // Google sign-in is off until it is set up in Supabase (tracker)

// Supabase OAuth sign-in. After the provider redirects back, /auth/callback
// exchanges the code for a session and sends the user to `next` (default /learn).
export function OAuthButtons({ next = "/learn" }: { next?: string }) {
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: Provider) {
    setPending(provider)
    setError(null)
    try {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
      if (error) throw error
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error("OAuth sign-in failed:", message)
      setError(
        /not enabled/i.test(message)
          ? "GitHub sign-in isn't available yet. Please use your email instead."
          : "Couldn't start sign-in. Please try again.",
      )
      setPending(null)
    }
  }

  return (
    <div className="grid gap-3">
      <Button variant="outline" onClick={() => signIn("github")} disabled={pending !== null} className="w-full">
        {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}
