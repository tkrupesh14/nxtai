import type { Metadata } from "next"
import Link from "next/link"

import { unsubscribeAction } from "@/app/(site)/unsubscribe/actions"
import { Button } from "@/components/site/ui/button"

export const metadata: Metadata = { title: "Email notifications — Krpex", robots: { index: false } }

const DONE = {
  ok: {
    title: "Emails turned off",
    body: "We won't email you about notifications any more. You'll still see them in the app, and we'll still send essential account emails, such as sign-in links and password resets.",
  },
  unknown: {
    title: "This link didn't work",
    body: "It may be from an old email. Log in and change your email settings instead.",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't turn emails off just now. Please try again in a moment.",
  },
} as const

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string }>
}) {
  const { t, done } = await searchParams
  const result = done && done in DONE ? DONE[done as keyof typeof DONE] : null

  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      {result ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{result.title}</h1>
          <p className="mt-3 text-muted-foreground text-pretty">{result.body}</p>
        </>
      ) : t ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Turn off notification emails?</h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            You&apos;ll still see notifications in the app. You can turn emails back on in your settings at any time.
          </p>
          <form action={unsubscribeAction} className="mt-8">
            <input type="hidden" name="t" value={t} />
            <Button type="submit">Turn off emails</Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Email notifications</h1>
          <p className="mt-3 text-muted-foreground text-pretty">Log in to choose which emails you get.</p>
        </>
      )}
      <p className="mt-8 text-sm">
        <Link href="/account/settings#email" className="text-primary hover:underline">
          Email settings
        </Link>
      </p>
    </main>
  )
}
