import type { Metadata } from "next"

import { codeLinks } from "@/lib/code/host"

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "How we keep Krpex Community helpful and safe: be kind, don't spoil problems, no ads, no personal details.",
}

const RULES: { title: string; text: string }[] = [
  { title: "Be kind", text: "Everyone here is learning. Explain, don't mock. No insults, harassment, hate or threats — about anyone." },
  {
    title: "Don't spoil problems",
    text: "Full solutions belong under a problem's Solutions, which open only after solving it. In discussions, share ideas and hints, and mark anything that gives the answer away as a spoiler.",
  },
  { title: "Post your own work", text: "Share code and writing you made yourself, or say clearly where it came from. Don't post exam or test answers." },
  { title: "No ads or spam", text: "No promotions, referral links or repeated posts. Links unlock at level 4 to keep spam out." },
  {
    title: "Keep personal details private",
    text: "Don't post phone numbers, addresses, emails or anything that identifies you or someone else. Your email is never shown on Krpex.",
  },
  { title: "Keep it legal and safe", text: "Nothing illegal, sexual or violent, and nothing that puts anyone at risk." },
]

export default async function GuidelinesPage() {
  const links = await codeLinks()
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Community guidelines</h1>
      <p className="mt-3 text-muted-foreground">Krpex Community is for learners helping each other. These rules apply to profiles and everything you post.</p>
      <ol className="mt-8 grid gap-4">
        {RULES.map((r, i) => (
          <li key={r.title} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">
              {i + 1}. {r.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{r.text}</p>
          </li>
        ))}
      </ol>
      <section className="mt-10 grid gap-2 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">If something breaks the rules</h2>
        <p>
          Use Report on the post or comment (coming with posts). Moderators may hide or remove content and pause or stop someone from posting. A profile that
          breaks the rules can be hidden until it is fixed.
        </p>
        <p>
          To report a profile, or anything else, write to us through the{" "}
          <a href={links.main("/contact")} className="font-medium text-primary hover:underline">
            contact page
          </a>
          . Posts stay yours; by posting you let Krpex show them on the site (see the{" "}
          <a href={links.main("/terms")} className="font-medium text-primary hover:underline">
            terms
          </a>{" "}
          and{" "}
          <a href={links.main("/privacy")} className="font-medium text-primary hover:underline">
            privacy policy
          </a>
          ).
        </p>
      </section>
    </main>
  )
}
