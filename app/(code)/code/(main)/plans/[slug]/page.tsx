import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DifficultyText } from "@/components/code/difficulty-badge"
import { FollowPlanButton } from "@/components/code/follow-plan-button"
import { IconChevronLeft, IconCircleCheck, IconDot } from "@/components/code/icons"
import { PlanProgress } from "@/components/code/plan-progress"
import { getMyProgress, getPlanState } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { nextInPlan, PLANS, planBySlug, planProblems } from "@/lib/code/plans"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getSignedInUser } from "@/lib/supabase/profile"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PLANS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = planBySlug((await params).slug)
  return plan ? { title: plan.title, description: plan.tagline } : {}
}

const summary = new Map(PROBLEM_SUMMARIES.map((p) => [p.slug, p]))

export default async function PlanPage({ params }: Props) {
  const { slug } = await params
  const plan = planBySlug(slug)
  if (!plan) notFound()
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const [progress, state] = user ? await Promise.all([getMyProgress(), getPlanState()]) : [null, null]
  const solved = new Set(progress?.solved ?? [])
  const tried = new Set(progress?.tried ?? [])
  const slugs = planProblems(plan)
  const done = slugs.filter((s) => solved.has(s)).length
  const next = nextInPlan(plan, solved)
  const finished = state?.finished[plan.slug]
  const href = (s: string) => `${links.code(`/p/${s}`)}?plan=${plan.slug}`
  const login = links.main(`/login?next=${encodeURIComponent(`/code/plans/${plan.slug}`)}`)
  let day = 0

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <Link href={links.code("/plans")} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <IconChevronLeft width={14} height={14} /> All study plans
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{plan.level}</span>
        <span className="text-muted-foreground">
          {plan.pace} · {slugs.length} problems · +{plan.bonus} XP for finishing
        </span>
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{plan.tagline}</p>

      <div className="mt-6 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        {user ? (
          <div>
            <PlanProgress done={done} total={slugs.length} />
            <p className="mt-2 text-sm">
              {finished ? (
                <span className="font-medium text-teal-700 dark:text-teal-400">
                  Completed on {new Date(finished).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })} · +{plan.bonus} XP earned
                </span>
              ) : next ? (
                <>
                  Next up:{" "}
                  <Link href={href(next)} className="font-medium text-primary hover:underline">
                    {summary.get(next)?.number}. {summary.get(next)?.title}
                  </Link>
                </>
              ) : (
                "All solved — the bonus arrives with your next solve."
              )}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Log in to track your progress, follow the plan and earn the finishing bonus.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {next && (
            <Link href={href(next)} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
              {done ? "Continue" : "Start"}
            </Link>
          )}
          <FollowPlanButton slug={plan.slug} following={user ? Boolean(state?.follows.includes(plan.slug)) : null} loginHref={login} />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {plan.sections.map((section) => {
          const n = section.problems.filter((s) => solved.has(s)).length
          return (
            <section key={section.title} aria-label={section.title}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold">{section.title}</h2>
                {user && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {n} / {section.problems.length}
                  </span>
                )}
              </div>
              <ol className="mt-3 divide-y overflow-hidden rounded-xl border bg-card">
                {section.problems.map((s) => {
                  day++
                  const p = summary.get(s)!
                  const isSolved = solved.has(s)
                  return (
                    <li key={s}>
                      <Link href={href(s)} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                        <span className="w-5 shrink-0">
                          {isSolved ? (
                            <>
                              <IconCircleCheck width={16} height={16} className="text-teal-600 dark:text-teal-400" />
                              <span className="sr-only">Solved: </span>
                            </>
                          ) : tried.has(s) ? (
                            <>
                              <IconDot width={16} height={16} className="text-amber-600 dark:text-amber-400" />
                              <span className="sr-only">Tried: </span>
                            </>
                          ) : null}
                        </span>
                        {plan.slug === "python-basics-30" && <span className="w-12 shrink-0 text-xs text-muted-foreground">Day {day}</span>}
                        <span className={isSolved ? "min-w-0 flex-1 truncate text-muted-foreground" : "min-w-0 flex-1 truncate font-medium"}>
                          {p.number}. {p.title}
                        </span>
                        <span className="hidden text-xs text-muted-foreground sm:inline">{p.tags.slice(0, 2).join(" · ")}</span>
                        <DifficultyText difficulty={p.difficulty} className="w-16 text-right text-xs" />
                      </Link>
                    </li>
                  )
                })}
              </ol>
            </section>
          )
        })}
      </div>
    </main>
  )
}
