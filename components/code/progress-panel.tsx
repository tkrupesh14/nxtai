import Link from "next/link"

import { DIFFICULTY_LABEL, DifficultyBadge } from "@/components/code/difficulty-badge"
import { IconCalendar, IconFlame } from "@/components/code/icons"
import type { Difficulty, ProblemSummary } from "@/lib/code/problems"

// Side column of the problem set: solved ring, today's problem, activity calendar, streak and level.

const RING: Record<Difficulty, string> = { easy: "stroke-teal-500", medium: "stroke-amber-500", hard: "stroke-rose-500" }
const BAR: Record<Difficulty, string> = { easy: "bg-teal-500", medium: "bg-amber-500", hard: "bg-rose-500" }

export function SolvedCard({ problems, solved, signedIn, loginHref }: { problems: ProblemSummary[]; solved: string[]; signedIn: boolean; loginHref: string }) {
  const done = new Set(solved)
  const by = (["easy", "medium", "hard"] as const).map((d) => ({
    d,
    total: problems.filter((p) => p.difficulty === d).length,
    solved: problems.filter((p) => p.difficulty === d && done.has(p.slug)).length,
  }))
  const total = problems.length
  const count = by.reduce((s, x) => s + x.solved, 0)
  // One ring, one arc per difficulty, each sized by solved / all problems, with a 2-unit gap between arcs.
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  const arcs = by.map((x) => {
    const len = (x.solved / total) * c
    const arc = { d: x.d, len: Math.max(0, len - (len > 3 ? 2 : 0)), offset }
    offset += len
    return arc
  })

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="solved-h">
      <h2 id="solved-h" className="text-sm font-semibold">
        Solved
      </h2>
      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${count} of ${total} problems solved`}>
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
            {arcs.map((a) =>
              a.len > 0 ? (
                <circle
                  key={a.d}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className={RING[a.d]}
                  strokeDasharray={`${a.len} ${c}`}
                  strokeDashoffset={-a.offset}
                />
              ) : null,
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">{count}</span>
            <span className="text-xs text-muted-foreground">of {total}</span>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2.5">
          {by.map((x) => (
            <li key={x.d}>
              <div className="flex justify-between text-xs">
                <span className="font-medium">{DIFFICULTY_LABEL[x.d]}</span>
                <span className="tabular-nums text-muted-foreground">
                  {x.solved}/{x.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${BAR[x.d]}`} style={{ width: `${x.total ? (x.solved / x.total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      {!signedIn && (
        <p className="mt-4 text-sm text-muted-foreground">
          <a href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </a>{" "}
          to track what you solve, keep a streak and earn XP.
        </p>
      )}
    </section>
  )
}

export function DailyCard({ problem, href, solved }: { problem: ProblemSummary; href: string; solved: boolean }) {
  return (
    <Link href={href} className="block rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
      <p className="flex items-center gap-2 text-xs font-medium text-primary">
        <IconCalendar width={14} height={14} /> Problem of the day · 2× XP
      </p>
      <p className="mt-2 font-semibold">
        {problem.number}. {problem.title}
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <DifficultyBadge difficulty={problem.difficulty} />
        <span>{problem.topic}</span>
        {solved && <span className="ml-auto font-medium text-teal-600 dark:text-teal-400">Solved ✓</span>}
      </div>
    </Link>
  )
}

const WEEKS = 26
const IST_MS = 330 * 60 * 1000
const DAY_MS = 86_400_000

/** Submissions per day for the last 26 weeks (IST), GitHub-style: a column per week, Monday at the top. */
export function ActivityCard({ activity, streak, level, now = Date.now() }: { activity: Record<string, number>; streak: { days: number; today: boolean }; level: { level: number; into: number; span: number }; now?: number }) {
  const today = Math.floor((now + IST_MS) / DAY_MS)
  const weekday = (today + 3) % 7 // 0 = Monday (1970-01-01 was a Thursday)
  const start = today - weekday - (WEEKS - 1) * 7
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => start + i)
  const iso = (d: number) => new Date(d * DAY_MS).toISOString().slice(0, 10)
  const total = Object.values(activity).reduce((a, b) => a + b, 0)
  const activeDays = Object.keys(activity).length
  // Four steps of one hue (sequential): 1, 2–3, 4–6, 7+ submissions.
  const step = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4)
  const SHADE = ["bg-muted", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"]

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="activity-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="activity-h" className="text-sm font-semibold">
          Activity
        </h2>
        <span className="flex items-center gap-1 text-sm font-medium" title={streak.today ? "You've studied today" : "Study today to keep your streak"}>
          <IconFlame className={streak.days > 0 ? "text-orange-500" : "text-muted-foreground"} />
          <span className="tabular-nums">{streak.days}</span>
          <span className="font-normal text-muted-foreground">day streak</span>
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {total} submission{total === 1 ? "" : "s"} on {activeDays} day{activeDays === 1 ? "" : "s"} in the last 6 months
      </p>
      <div className="mt-3 grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }} role="img" aria-label={`Activity calendar: ${total} submissions in the last 26 weeks`}>
        {days.map((d) => {
          const n = d > today ? -1 : (activity[iso(d)] ?? 0)
          return (
            <span
              key={d}
              title={n < 0 ? undefined : `${n} submission${n === 1 ? "" : "s"} · ${new Date(d * DAY_MS).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}`}
              className={`aspect-square rounded-[2px] ${n < 0 ? "bg-transparent" : SHADE[step(n)]} ${d === today ? "ring-1 ring-foreground/40" : ""}`}
            />
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        Less
        {SHADE.map((s) => (
          <span key={s} className={`size-2.5 rounded-[2px] ${s}`} />
        ))}
        More
      </div>
      <div className="mt-4 border-t pt-3">
        <div className="flex justify-between text-xs">
          <span className="font-medium">Level {level.level}</span>
          <span className="tabular-nums text-muted-foreground">
            {level.into}/{level.span} XP
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${level.span ? Math.min(100, (level.into / level.span) * 100) : 0}%` }} />
        </div>
      </div>
    </section>
  )
}
