import type { Metadata } from "next"
import Link from "next/link"

import { BetaForm } from "@/components/site/beta-form"
import { Button } from "@/components/site/ui/button"
import { getBetaStatus } from "@/lib/beta/access"
import { BETA_DEVICES, BETA_ROLES } from "@/lib/beta/options"
import { CODE_ORIGIN, COMMUNITY_ORIGIN } from "@/lib/code-host"
import { safeNext } from "@/lib/safe-next"
import { displayNameFor, getSignedInUser } from "@/lib/supabase/profile"

export const metadata: Metadata = {
  title: "Join the beta — Krpex",
  description: "Krpex is in a closed beta. Apply to try Krpex courses, Krpex Code and Krpex Community, with Pro free while you test.",
}

const OFFER = [
  { title: "Krpex courses", body: "A personal course for whatever you want to learn, taught class-style by an AI professor, with quizzes and answers to your questions." },
  { title: "Krpex Code", body: "150 coding problems in Python and JavaScript, a proper workspace in your browser, study plans and an AI coach." },
  { title: "Krpex Community", body: "Share solutions, ask for help and talk about your courses with other learners." },
]
const ASK = [
  "Use Krpex the way you normally would: learn, practise, ask questions.",
  "Tell us when something breaks, confuses you or could be better, with the Feedback button on every page.",
  "Pro is free for 30 days once you're in, so you can try everything.",
]

const label = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id
const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", timeZone: "Asia/Kolkata" })

export default async function BetaPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  const [status, user] = await Promise.all([getBetaStatus(), getSignedInUser()])
  const next = safeNext(from, "/learn")
  const here = `/beta${from ? `?from=${encodeURIComponent(next)}` : ""}`
  const app = status.application

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="text-sm font-medium text-primary">Closed beta</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl">Help us build Krpex</h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        Krpex is open to a small group of beta testers while we finish it. Apply below; we read every application and email you when you&apos;re in.
      </p>

      {status.access ? (
        <section className="mt-8 rounded-xl border border-primary/40 bg-primary/5 p-6" aria-labelledby="beta-in">
          <h2 id="beta-in" className="text-xl font-semibold">
            {status.closed ? "You're in" : "Krpex is open to everyone"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {status.closed
              ? "Krpex courses, Krpex Code and Krpex Community are all open to you. Thanks for testing!"
              : "The beta has ended, so there's nothing to apply for. Everything is open."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={next}>Continue</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={CODE_ORIGIN}>Krpex Code</a>
            </Button>
            <Button asChild variant="outline">
              <a href={COMMUNITY_ORIGIN}>Krpex Community</a>
            </Button>
          </div>
        </section>
      ) : null}

      {!status.access && app?.status === "waiting" ? (
        <section className="mt-8 rounded-xl border bg-card p-6" aria-labelledby="beta-waiting">
          <h2 id="beta-waiting" className="text-xl font-semibold">
            You&apos;re on the list
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You applied on {date(app.created_at)}. We&apos;ll email you and let you know here once you&apos;re in. Until then you can change your answers below.
          </p>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="break-words">{app.name}</dd>
            <dt className="text-muted-foreground">About you</dt>
            <dd>{label(BETA_ROLES, app.role)}</dd>
            <dt className="text-muted-foreground">Device</dt>
            <dd>{label(BETA_DEVICES, app.device)}</dd>
            <dt className="text-muted-foreground">Wants to learn</dt>
            <dd className="break-words">{app.goal}</dd>
          </dl>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium text-primary">Change my application</summary>
            <div className="mt-4">
              <BetaForm name={app.name} initial={app} />
            </div>
          </details>
        </section>
      ) : null}

      {!status.access && app?.status === "declined" ? (
        <section className="mt-8 rounded-xl border bg-card p-6" aria-labelledby="beta-declined">
          <h2 id="beta-declined" className="text-xl font-semibold">
            Not this time
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We can&apos;t take you into the beta just yet. We&apos;ll let you know when Krpex opens to everyone. Questions?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>
            .
          </p>
        </section>
      ) : null}

      {!status.access && !app ? (
        <section className="mt-8 rounded-xl border bg-card p-6" aria-labelledby="beta-apply">
          <h2 id="beta-apply" className="text-xl font-semibold">
            Apply for the beta
          </h2>
          {user ? (
            <div className="mt-5">
              <BetaForm name={displayNameFor(user)} />
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Create a free Krpex account first; it takes a minute. Then you&apos;ll come straight back here to apply.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/create-account?next=${encodeURIComponent(here)}`}>Create an account</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/login?next=${encodeURIComponent(here)}`}>Log in</Link>
                </Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="beta-what">
        <h2 id="beta-what" className="text-lg font-semibold">
          What you get to try
        </h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {OFFER.map((o) => (
            <li key={o.title} className="rounded-lg border p-4">
              <p className="font-medium">{o.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="beta-ask">
        <h2 id="beta-ask" className="text-lg font-semibold">
          What we ask of testers
        </h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-muted-foreground">
          {ASK.map((a) => (
            <li key={a}>{a}</li>
          ))}
          <li>
            We record how testers use Krpex (pages visited and what you do there) and record sessions on screen, with everything you type hidden. It&apos;s
            only used to find problems and improve Krpex. See our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              privacy policy
            </Link>
            .
          </li>
        </ul>
      </section>
    </main>
  )
}
