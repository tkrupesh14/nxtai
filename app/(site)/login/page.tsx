import Link from "next/link"

import { OAuthButtons } from "@/components/site/oauth-buttons"

const ERRORS: Record<string, string> = {
  oauth: "We couldn't finish signing you in. Please try again.",
}

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/learn"
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
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Welcome back to NxtAI</h1>
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
        <OAuthButtons next={safeNext(next)} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="hover:text-foreground hover:underline">
            Use email and password instead
          </Link>
        </p>
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
