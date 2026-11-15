import type { Metadata } from "next"

import { unsubscribeCampaignAction } from "@/app/(site)/email/unsubscribe/actions"
import { Button } from "@/components/site/ui/button"
import { LEGAL } from "@/lib/legal"

export const metadata: Metadata = { title: "Unsubscribe — Krpex", robots: { index: false } }

const DONE = {
  ok: { title: "You're unsubscribed", body: "We won't send you Krpex news or announcements again. If you have a Krpex account, you'll still get essential account emails." },
  unknown: { title: "This link didn't work", body: `It may be from an old email. Write to ${LEGAL.email} and we'll take you off the list.` },
  error: { title: "Something went wrong", body: "We couldn't unsubscribe you just now. Please try again in a moment." },
} as const

// Unsubscribe from campaign emails (E.3). A button, not the link itself, so mail scanners that open links
// don't unsubscribe people by accident; mail apps' own Unsubscribe button posts to /api/email/u.
export default async function EmailUnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const { t, done } = await searchParams
  const result = done && done in DONE ? DONE[done as keyof typeof DONE] : null
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      {result ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">{result.title}</h1>
          <p className="mt-3 text-pretty text-muted-foreground">{result.body}</p>
        </>
      ) : t ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Unsubscribe from Krpex emails?</h1>
          <p className="mt-3 text-pretty text-muted-foreground">We&apos;ll stop sending you news and announcements, for good.</p>
          <form action={unsubscribeCampaignAction} className="mt-8">
            <input type="hidden" name="t" value={t} />
            <Button type="submit">Unsubscribe</Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">Unsubscribe</h1>
          <p className="mt-3 text-pretty text-muted-foreground">Use the link at the bottom of one of our emails, or write to {LEGAL.email}.</p>
        </>
      )}
    </main>
  )
}
