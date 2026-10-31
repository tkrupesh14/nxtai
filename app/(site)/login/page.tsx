import Link from "next/link"

import { OAuthButtons } from "@/components/site/oauth-buttons"

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Welcome back to NxtAI</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Continue your adaptive course, track your progress, and connect with your community.
        </p>
      </div>
      <section className="rounded-lg border bg-card p-6">
        <OAuthButtons />
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
