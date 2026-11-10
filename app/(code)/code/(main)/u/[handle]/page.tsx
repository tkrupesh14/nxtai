import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LevelBadge } from "@/components/community/level-badge"
import { DifficultyText } from "@/components/code/difficulty-badge"
import { IconCircleCheck } from "@/components/code/icons"
import { ActivityCard, SolvedCard } from "@/components/code/progress-panel"
import { codeLinks } from "@/lib/code/host"
import { planBySlug } from "@/lib/code/plans"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getPublicProfile } from "@/lib/community/data"
import { learningStats } from "@/lib/learning/stats"
import { xpLevel } from "@/lib/learning/xp"
import { getSignedInUser, initialsFor } from "@/lib/supabase/profile"

// Community 5a: a learner's public page (only when they turned it on; migration 033 public_profile()).

type Props = { params: Promise<{ handle: string }> }

const date = (iso: string, month: "long" | "short" = "short") =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month, year: "numeric", timeZone: "Asia/Kolkata" })

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublicProfile(decodeURIComponent((await params).handle).toLowerCase())
  if (!p) return { title: "Profile not found", robots: { index: false } }
  const level = xpLevel(p.xp).level
  const solved = p.solved.easy + p.solved.medium + p.solved.hard
  return {
    title: `${p.display_name} (@${p.handle})`,
    description: p.bio || `Level ${level} on Krpex · ${solved} coding problems solved.`,
  }
}

const summary = new Map(PROBLEM_SUMMARIES.map((p) => [p.slug, p]))

export default async function ProfilePage({ params }: Props) {
  const raw = decodeURIComponent((await params).handle)
  const p = await getPublicProfile(raw.toLowerCase())
  if (!p) notFound()
  const [links, user] = await Promise.all([codeLinks(), getSignedInUser()])
  const level = xpLevel(p.xp)
  const stats = learningStats([], [], Date.now(), { studyDays: p.study_days, frozenDays: p.frozen_days })
  const solved = p.solved.easy + p.solved.medium + p.solved.hard
  const plans = p.plans.map((x) => ({ ...x, plan: planBySlug(x.plan) })).filter((x) => x.plan)

  return (
    <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 content-start gap-6">
        <section className="flex items-start gap-4">
          <div aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-muted text-lg font-semibold">
            {initialsFor(p.display_name)}
          </div>
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              <span className="min-w-0 break-words">{p.display_name}</span>
              <LevelBadge level={level.level} className="text-xs" />
            </h1>
            <p className="text-sm text-muted-foreground">@{p.handle}</p>
            {p.bio && <p className="mt-2 max-w-prose break-words text-sm">{p.bio}</p>}
            {p.joined && <p className="mt-2 text-xs text-muted-foreground">Learning on Krpex since {new Date(p.joined).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Level", value: level.level },
            { label: "XP", value: level.total.toLocaleString("en-IN") },
            { label: "Day streak", value: stats.streak },
            { label: "Problems solved", value: solved },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="plans-h" className="rounded-xl border bg-card p-5">
          <h2 id="plans-h" className="text-sm font-semibold">
            Study plans finished
          </h2>
          {plans.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {plans.map((x) => (
                <li key={x.plan!.slug}>
                  <Link
                    href={links.code(`/plans/${x.plan!.slug}`)}
                    title={`Finished ${date(x.at, "long")}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-sm font-medium hover:border-teal-500"
                  >
                    <IconCircleCheck width={14} height={14} className="text-teal-600 dark:text-teal-400" />
                    {x.plan!.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No study plans finished yet.</p>
          )}
          {p.lessons > 0 && (
            <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
              Also passed <span className="font-medium text-foreground tabular-nums">{p.lessons}</span> lesson{p.lessons === 1 ? "" : "s"} in Krpex courses.
            </p>
          )}
        </section>

        {p.recent && (
          <section aria-labelledby="recent-h" className="rounded-xl border bg-card">
            <h2 id="recent-h" className="px-5 pt-5 text-sm font-semibold">
              Recently solved
            </h2>
            {p.recent.length ? (
              <ul className="mt-2 divide-y">
                {p.recent.map((r) => {
                  const s = summary.get(r.problem)
                  if (!s) return null
                  return (
                    <li key={r.problem}>
                      <Link href={links.code(`/p/${s.slug}`)} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-muted/50">
                        <span className="min-w-0 flex-1 truncate">
                          {s.number}. {s.title}
                        </span>
                        <DifficultyText difficulty={s.difficulty} />
                        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">{date(r.at)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-2 text-sm text-muted-foreground">Nothing solved yet.</p>
            )}
          </section>
        )}
      </div>

      <aside className="grid min-w-0 content-start gap-6">
        <SolvedCard problems={PROBLEM_SUMMARIES} solved={p.solved} signedIn loginHref="" />
        <ActivityCard activity={p.activity} streak={{ days: stats.streak, today: stats.activeToday }} level={level} self={false} />
        {!user && (
          <p className="text-sm text-muted-foreground">
            <a href={links.main("/login?next=/account%23public-profile")} className="font-medium text-primary underline-offset-4 hover:underline">
              Join Krpex
            </a>{" "}
            to practise coding, keep a streak and get your own profile.
          </p>
        )}
      </aside>
    </main>
  )
}
