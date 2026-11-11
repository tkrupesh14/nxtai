import Link from "next/link"

import { Button } from "@/components/site/ui/button"
import { getMyPublicProfile } from "@/lib/community/data"
import { codeLinks } from "@/lib/code/host"
import { getSignedInUser } from "@/lib/supabase/profile"

// community.krpex.in home. Profiles are live; solutions, discussions and boards come in 5b–5c (plan.md Phase 5).

const PARTS = [
  {
    title: "Public profiles",
    text: "Your level, streak, solved problems and finished study plans on one page you can share. Private until you turn it on.",
    live: true,
  },
  {
    title: "Solutions and discussions",
    text: "Every coding problem has its own Solutions and Discussion. Open a problem on Krpex Code and find them under Community. Solutions unlock once you've solved it.",
    live: true,
  },
  {
    title: "Boards for every subject",
    text: "Ask for help, prepare for interviews together and talk about your courses, from Python to Physics.",
    live: false,
  },
]

export default async function CommunityHome() {
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const me = user ? await getMyPublicProfile() : null
  const setup = links.main("/account#public-profile")

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <section className="pb-10 pt-14 text-center md:pt-20">
        <p className="text-sm font-medium text-primary">Krpex Community</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">Learn together</h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
          Share how you solved a problem, ask when you&apos;re stuck and show how far you&apos;ve come — with the same account you use for courses and coding.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!user ? (
            <Button asChild size="lg">
              <a href={links.main(`/login?next=${encodeURIComponent("/account#public-profile")}`)}>Join and claim your handle</a>
            </Button>
          ) : me?.is_public && !me.hidden ? (
            <Button asChild size="lg">
              <Link href={links.community(`/u/${me.handle}`)}>View your profile</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <a href={setup}>{me ? "Make your profile public" : "Claim your handle"}</a>
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link href={links.community("/guidelines")}>Community guidelines</Link>
          </Button>
        </div>
      </section>

      <ul className="grid gap-4 md:grid-cols-3">
        {PARTS.map((p) => (
          <li key={p.title} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{p.title}</h2>
              <span
                className={
                  p.live
                    ? "shrink-0 whitespace-nowrap rounded-full border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-700 dark:text-teal-300"
                    : "shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                }
              >
                {p.live ? "Live" : "Coming soon"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Meanwhile, keep practising on{" "}
        <a href={links.code("/problems")} className="font-medium text-primary hover:underline">
          Krpex Code
        </a>{" "}
        or in{" "}
        <a href={links.main("/learn")} className="font-medium text-primary hover:underline">
          your courses
        </a>
        .
      </p>
    </main>
  )
}
