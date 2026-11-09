import type { Metadata } from "next"

import Link from "next/link"

import { ActivityCard, DailyCard, SolvedCard } from "@/components/code/progress-panel"
import { ProblemTable, type TableFilters } from "@/components/code/problem-table"
import { getDailyProblem, getMyProgress, getProblemStats, type MyProgress } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { TAGS } from "@/lib/code/meta"
import { PLANS, planProblems } from "@/lib/code/plans"
import { PROBLEM_SUMMARIES, TOPICS } from "@/lib/code/problems"
import { getMyXp, getStreakExtras } from "@/lib/learning/data"
import { learningStats } from "@/lib/learning/stats"
import { xpLevel } from "@/lib/learning/xp"
import { getSignedInUser } from "@/lib/supabase/profile"

export const metadata: Metadata = {
  title: "Problems",
  description: "Coding problems from first loops to dynamic programming, in Python or JavaScript, checked by tests that run in your browser.",
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "")

export default async function ProblemsPage({ searchParams }: Props) {
  const sp = await searchParams
  const [user, links, dailySlug, stats] = await Promise.all([getSignedInUser(), codeLinks(), getDailyProblem(), getProblemStats()])
  const empty: MyProgress = { solved: [], tried: [], activity: {} }
  const [progress, xp, extras] = user ? await Promise.all([getMyProgress(), getMyXp(), getStreakExtras()]) : [empty, { total: 0, week: 0 }, null]
  const daily = dailySlug ? PROBLEM_SUMMARIES.find((p) => p.slug === dailySlug) : undefined
  const streak = extras ? learningStats([], [], Date.now(), extras) : null
  const level = xpLevel(xp.total)

  const pick = <T extends string>(v: string, allowed: readonly T[]): T | "" => ((allowed as readonly string[]).includes(v) ? (v as T) : "")
  const initial: TableFilters = {
    q: one(sp.q).slice(0, 80),
    difficulty: pick(one(sp.difficulty), ["easy", "medium", "hard"] as const),
    status: user ? pick(one(sp.status), ["solved", "tried", "todo"] as const) : "",
    tag: pick(one(sp.tag), TAGS),
    topic: pick(one(sp.topic), TOPICS),
    sort: pick(one(sp.sort), ["number", "difficulty", "acceptance", "title"] as const) || "number",
  }
  const login = links.main(`/login?next=${encodeURIComponent("/code/problems")}`)

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROBLEM_SUMMARIES.length} problems in Python or JavaScript. Tests run in your browser — no waiting.
            </p>
          </div>
        </div>
        <ProblemTable
          problems={PROBLEM_SUMMARIES}
          topics={TOPICS}
          tags={TAGS}
          stats={stats}
          solved={progress.solved}
          tried={progress.tried}
          daily={daily?.slug ?? null}
          hrefPrefix={links.code("/p/")}
          initial={initial}
          signedIn={Boolean(user)}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-4" aria-label="Your progress">
        {daily && <DailyCard problem={daily} href={links.code(`/p/${daily.slug}`)} solved={progress.solved.includes(daily.slug)} />}
        <SolvedCard problems={PROBLEM_SUMMARIES} solved={progress.solved} signedIn={Boolean(user)} loginHref={login} />
        {user && streak && <ActivityCard activity={progress.activity} streak={{ days: streak.streak, today: streak.activeToday }} level={level} />}
        <nav aria-label="Study plans" className="rounded-xl border bg-card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Study plans</h2>
            <Link href={links.code("/plans")} className="text-xs font-medium text-primary hover:underline">
              All
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {PLANS.map((p) => (
              <li key={p.slug}>
                <Link href={links.code(`/plans/${p.slug}`)} className="flex items-baseline justify-between gap-2 hover:text-primary">
                  <span className="truncate">{p.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{planProblems(p).length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </main>
  )
}
