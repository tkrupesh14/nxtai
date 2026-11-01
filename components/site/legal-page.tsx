import Link from "next/link"

import { LEGAL, operatorName } from "@/lib/legal"

/** Shared layout for Terms, Privacy and Refund pages. */
export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string
  summary: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <p className="text-sm text-muted-foreground">Last updated: {LEGAL.lastUpdated}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h1>
      <div className="mt-6 rounded-xl border bg-muted/40 p-5 text-sm text-pretty">
        <p className="mb-1 font-medium">In short</p>
        {summary}
      </div>
      <div className="legal-body mt-10 grid gap-8 text-[0.95rem] leading-relaxed">{children}</div>
      <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/refund-policy" className="hover:text-foreground">
          Refund & Cancellation
        </Link>
        <Link href="/contact" className="hover:text-foreground">
          Contact
        </Link>
      </nav>
    </main>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export function List({ children }: { children: React.ReactNode }) {
  return <ul className="grid list-disc gap-1.5 pl-5">{children}</ul>
}

export function ContactBlock() {
  return (
    <div className="rounded-lg border p-4 text-sm">
      <p className="font-medium">{operatorName()}</p>
      {LEGAL.address ? <p className="text-muted-foreground">{LEGAL.address}</p> : null}
      <p>
        Email:{" "}
        <a href={`mailto:${LEGAL.email}`} className="text-primary hover:underline">
          {LEGAL.email}
        </a>
      </p>
      <p>
        Website:{" "}
        <Link href="/" className="text-primary hover:underline">
          {LEGAL.site}
        </Link>
      </p>
    </div>
  )
}
