import Link from "next/link"

import { AuthDivider } from "@/components/site/auth-divider"
import { EmailLoginForm } from "@/components/site/email-auth"
import { OAuthButtons } from "@/components/site/oauth-buttons"
import { safeNext } from "@/lib/safe-next"

const ERRORS: Record<string, string> = {
  oauth: "We couldn't finish signing you in. Please try again.",
  signup_link:
    "That confirmation link couldn't sign you in here. If you've already clicked it, your email is confirmed: log in below.",
  reset_link: "That reset link has expired or was opened in a different browser. Please request a new one.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const errorMessage = error ? (ERRORS[error] ?? ERRORS.oauth) : null

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Welcome back to Krpex</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Continue your adaptive course, track your progress, and connect with your community.
        </p>
      </div>
      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {errorMessage}
        </p>
      )}
      <section className="rounded-lg border bg-card p-6">
        <EmailLoginForm next={safeNext(next)} />
        <AuthDivider />
        <OAuthButtons next={safeNext(next)} />
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/create-account" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </main>
  )
}
