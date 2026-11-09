import type { Metadata } from "next"
import Link from "next/link"

import { PlanProgress } from "@/components/code/plan-progress"
import { getMyProgress, getPlanState } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { PLANS, planMix, planProblems } from "@/lib/code/plans"
import { getSignedInUser } from "@/lib/supabase/profile"

export const metadata: Metadata = {
  title: "Study plans",
  description: "Guided coding plans: Python basics in 30 days, placement prep for arrays and strings, interview patterns, dynamic programming and the Krpex 150.",
}

export default async function PlansPage() {
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const [progress, state] = user ? await Promise.all([getMyProgress(), getPlanState()]) : [null, null]
  const solved = new Set(progress?.solved ?? [])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Study plans</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Problems in a sensible order, with your progress as you go. Finish a plan for bonus XP and a badge. Problems you&apos;ve already solved count.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const slugs = planProblems(plan)
          const done = slugs.filter((s) => solved.has(s)).length
          const mix = planMix(plan)
          const finished = state?.finished[plan.slug]
          const following = state?.follows.includes(plan.slug)
          return (
            <li key={plan.slug}>
              <Link href={links.code(`/plans/${plan.slug}`)} className="flex h-full flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{plan.level}</span>
                  <span className="text-muted-foreground">{plan.pace}</span>
                  {finished ? (
                    <span className="ml-auto rounded-full bg-teal-500/15 px-2 py-0.5 font-medium text-teal-700 dark:text-teal-300">Completed ✓</span>
                  ) : following ? (
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">Following</span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold">{plan.title}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {slugs.length} problems ·{" "}
                  {[
                    mix.easy && <span key="e" className="text-teal-700 dark:text-teal-400">{mix.easy} easy</span>,
                    mix.medium && <span key="m" className="text-amber-700 dark:text-amber-400">{mix.medium} medium</span>,
                    mix.hard && <span key="h" className="text-rose-700 dark:text-rose-400">{mix.hard} hard</span>,
                  ]
                    .filter(Boolean)
                    .flatMap((el, i) => (i ? [" · ", el] : [el]))}{" "}
                  · +{plan.bonus} XP for finishing
                </p>
                {user && <PlanProgress done={done} total={slugs.length} className="mt-4" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
