import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/site/ui/button"

export const metadata: Metadata = { title: "Something went wrong — Krpex" }

const REASONS: Record<string, { title: string; body: string; retry: { href: string; label: string } }> = {
  login: {
    title: "We couldn't log you in",
    body: "The email or password didn't match. Check them and try again.",
    retry: { href: "/login", label: "Try again" },
  },
  signup: {
    title: "We couldn't create your account",
    body: "That email may already be registered, or the password is too short. Try again or log in instead.",
    retry: { href: "/create-account", label: "Try again" },
  },
  confirm: {
    title: "This link didn't work",
    body: "The confirmation link is invalid or has expired. Log in to get a new one.",
    retry: { href: "/login", label: "Go to log in" },
  },
}

const FALLBACK = {
  title: "Something went wrong",
  body: "An unexpected error happened. Please try again in a moment.",
  retry: { href: "/", label: "Back to home" },
}

export default async function ErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  const { title, body, retry } = (reason && REASONS[reason]) || FALLBACK

  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>
      <p className="mt-3 text-muted-foreground text-pretty">{body}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link href={retry.href}>{retry.label}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact">Contact us</Link>
        </Button>
      </div>
    </main>
  )
}
