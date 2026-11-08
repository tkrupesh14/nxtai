import type { Metadata } from "next"
import Link from "next/link"

import { DifficultyBadge } from "@/components/code/difficulty-badge"
import { getDailyProblem, getMyProgress } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { PROBLEMS, TOPICS, XP_FOR, problemBySlug } from "@/lib/code/problems"
import { getSignedInUser } from "@/lib/supabase/profile"

export const metadata: Metadata = {
  title: "Practice problems",
  description: "Coding problems from first loops to sorting and searching, in Python or JavaScript, checked by tests in your browser.",
}

export default async function ProblemsPage() {
  const [user, links, dailySlug] = await Promise.all([getSignedInUser(), codeLinks(), getDailyProblem()])
  const { solved, tried } = user ? await getMyProgress() : { solved: new Set<string>(), tried: new Set<string>() }
  const daily = dailySlug ? problemBySlug(dailySlug) : null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Practice problems</h1>
      <p className="mt-2 text-muted-foreground">
        {PROBLEMS.length} problems in Python or JavaScript. Each is checked by tests in your browser.
        {user ? ` You've solved ${solved.size}.` : " Log in to save your solutions and earn XP."}
      </p>

      {daily && (
        <Link
          href={links.code(`/p/${daily.slug}`)}
          className="mt-6 block rounded-xl border border-primary/40 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
        >
          <p className="text-sm font-medium text-primary">Problem of the day · double XP</p>
          <p className="mt-1 text-lg font-semibold">
            {solved.has(daily.slug) && <span className="mr-1">✓</span>}
            {daily.title}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <DifficultyBadge difficulty={daily.difficulty} /> {daily.topic} · {XP_FOR[daily.difficulty] * 2} XP for a first solve today
          </p>
        </Link>
      )}

      {TOPICS.map((topic) => {
        const list = PROBLEMS.filter((p) => p.topic === topic)
        if (list.length === 0) return null
        const done = list.filter((p) => solved.has(p.slug)).length
        return (
          <section key={topic} className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{topic}</h2>
              {user && (
                <span className="text-sm text-muted-foreground">
                  {done}/{list.length} solved
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y rounded-xl border bg-card">
              {list.map((p) => {
                const state = solved.has(p.slug) ? "solved" : tried.has(p.slug) ? "tried" : "new"
                return (
                  <li key={p.slug}>
                    <Link href={links.code(`/p/${p.slug}`)} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                      <span
                        aria-label={state === "solved" ? "Solved" : state === "tried" ? "Tried" : undefined}
                        className={
                          state === "solved" ? "w-4 text-emerald-600 dark:text-emerald-400" : state === "tried" ? "w-4 text-amber-600 dark:text-amber-400" : "w-4"
                        }
                      >
                        {state === "solved" ? "✓" : state === "tried" ? "•" : ""}
                      </span>
                      <span className="flex-1 font-medium">{p.title}</span>
                      <DifficultyBadge difficulty={p.difficulty} />
                      <span className="hidden w-14 text-right text-sm text-muted-foreground sm:inline">{XP_FOR[p.difficulty]} XP</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
