"use client"

import { useState } from "react"

import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/client"

type Provider = "github" | "google"

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
          ? `${provider === "github" ? "GitHub" : "Google"} sign-in isn't available yet. Please try another option.`
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
      <Button variant="outline" onClick={() => signIn("google")} disabled={pending !== null} className="w-full">
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive-foreground">
          {error}
        </p>
      )}
    </div>
  )
}
