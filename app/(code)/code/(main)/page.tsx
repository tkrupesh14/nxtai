import Link from "next/link"

import { PlanProgress } from "@/components/code/plan-progress"
import { FeedList } from "@/components/community/feed-list"
import { Button } from "@/components/site/ui/button"
import { getBetaStatus } from "@/lib/beta/access"
import { getMyProgress, getPlanState } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { nextInPlan, PLANS, planBySlug, planProblems } from "@/lib/code/plans"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getFeed } from "@/lib/community/data"
import { getSignedInUser } from "@/lib/supabase/profile"

const NOW = [
  { title: "150 practice problems", body: "From first loops to dynamic programming, stacks and grids, with filters, tags, an acceptance rate for each and a problem of the day worth double XP." },
  { title: "A real workspace", body: "Problem and code side by side, your own test cases with the expected answer, and clear results — the failing test shown in full, even a hidden one." },
  { title: "Hints, then the solution", body: "Hints in small steps that never cost XP. The official solution, with a short explanation of the idea, is there when you need it; the problem just stops giving XP." },
  { title: "An AI coach", body: "Hints in three steps that never hand over the code, help with a failing test, and a review once you've solved it. 3 free a day." },
  { title: "Runs on your device", body: "Python 3.14 and modern JavaScript run in your own browser, so results come back instantly. Works on a phone too." },
  { title: "One streak with your courses", body: "Solves count as study days and earn XP towards the same levels and rewards as your Krpex courses." },
]
const NEXT = [
  { title: "More problems and languages", body: "The bank growing to 300 problems, SQL practice, and a web playground for HTML, CSS and JavaScript." },
  { title: "Contests", body: "Weekly contests with a leaderboard and leagues, checked on our servers so rankings are fair." },
]

const titles = new Map(PROBLEM_SUMMARIES.map((p) => [p.slug, `${p.number}. ${p.title}`]))

export default async function CodeHome() {
  const [links, user, feed, beta] = await Promise.all([codeLinks(), getSignedInUser(), getFeed("code", 5), getBetaStatus()])
  const [progress, state] = user ? await Promise.all([getMyProgress(), getPlanState()]) : [null, null]
  const solved = new Set(progress?.solved ?? [])
  const following = (state?.follows ?? []).map(planBySlug).filter((p) => p !== null)
  return (
    <main>
      {following.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8" aria-label="Your study plans">
          <h2 className="text-lg font-semibold tracking-tight">Continue your plans</h2>
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {following.map((plan) => {
              const slugs = planProblems(plan)
              const next = nextInPlan(plan, solved)
              return (
                <li key={plan.slug} className="rounded-xl border bg-card p-4">
                  <Link href={links.code(`/plans/${plan.slug}`)} className="font-semibold hover:text-primary">
                    {plan.title}
                  </Link>
                  <PlanProgress done={slugs.filter((s) => solved.has(s)).length} total={slugs.length} className="mt-3" />
                  {next ? (
                    <Link href={`${links.code(`/p/${next}`)}?plan=${plan.slug}`} className="mt-3 block truncate text-sm text-primary hover:underline">
                      Next: {titles.get(next)} →
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-teal-700 dark:text-teal-400">Completed ✓</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-14 text-center md:pt-20">
        <p className="text-sm font-medium text-primary">Krpex Code</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-6xl">Practise coding right in your browser</h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
          Solve problems in Python or JavaScript with a proper workspace, see your tests pass instantly and earn XP for your Krpex streak.
        </p>
        {beta.access ? (
          <>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href={links.code("/problems")}>Start solving</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={links.code("/playground")}>Open the playground</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free · no install · Python loads once (about 12 MB), then it&apos;s quick</p>
          </>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <a href={links.main(`/beta?from=${encodeURIComponent("/code/problems")}`)}>{beta.application ? "See your beta application" : "Apply for the beta"}</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Krpex Code is in a closed beta. Approved testers get every problem, the playground and Pro free for 30 days.</p>
          </>
        )}

        <div aria-hidden className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-xl border bg-card text-left shadow-sm">
          <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">main.py</span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
            <span className="text-primary">def</span> greet(name):{"\n"}
            {"    "}
            <span className="text-primary">return</span> f&quot;Namaste, {"{name}"}!&quot;{"\n\n"}
            print(greet(&quot;Asha&quot;))
          </pre>
          <div className="border-t bg-muted/40 px-4 py-3 font-mono text-sm">
            <span className="text-muted-foreground">Output · </span>Namaste, Asha!
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Ready now</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {NOW.map((f) => (
            <li key={f.title} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">Study plans</h2>
          <Link href={links.code("/plans")} className="text-sm font-medium text-primary hover:underline">
            All plans →
          </Link>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <li key={plan.slug}>
              <Link href={links.code(`/plans/${plan.slug}`)} className="block h-full rounded-xl border bg-card p-4 transition-colors hover:border-primary/50">
                <p className="text-xs text-muted-foreground">
                  {plan.level} · {planProblems(plan).length} problems
                </p>
                <h3 className="mt-1 font-semibold">{plan.title}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="community">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="community" className="text-2xl font-semibold tracking-tight">
            From the community
          </h2>
          <a href={links.community("/")} className="text-sm font-medium text-primary hover:underline">
            Krpex Community →
          </a>
        </div>
        {feed.length ? (
          <div className="mt-6">
            <FeedList posts={feed} community={links.community} compact />
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Every problem has its own Discussion, and its community Solutions open once you&apos;ve solved it. For anything else, try the{" "}
            <a href={links.community("/c/help")} className="font-medium text-primary hover:underline">
              Help
            </a>{" "}
            and{" "}
            <a href={links.community("/c/interviews")} className="font-medium text-primary hover:underline">
              Interview prep
            </a>{" "}
            boards.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-4">
        <h2 className="text-2xl font-semibold tracking-tight">Coming next</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {NEXT.map((f) => (
            <li key={f.title} className="rounded-xl border border-dashed p-5">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
