"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { DifficultyText } from "@/components/code/difficulty-badge"
import { IconCalendar, IconCircleCheck, IconDot, IconSearch, IconShuffle, IconX } from "@/components/code/icons"
import type { Difficulty, ProblemSummary, Topic } from "@/lib/code/problems"
import { cn } from "@/lib/utils"

export type TableFilters = { q: string; difficulty: "" | Difficulty; status: "" | "solved" | "tried" | "todo"; tag: string; topic: string; sort: Sort }
type Sort = "number" | "difficulty" | "acceptance" | "title"
type Stat = { submissions: number; accepted: number }

const DIFF_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }
/** Acceptance is shown once a problem has this many submissions; fewer would be noise. */
const MIN_FOR_RATE = 5

export function acceptance(s: Stat | undefined) {
  return s && s.submissions >= MIN_FOR_RATE ? s.accepted / s.submissions : null
}

/** The problem set: search, filters (kept in the URL), sort, pick one, and a dense table. */
export function ProblemTable({
  problems,
  topics,
  tags,
  stats,
  solved,
  tried,
  daily,
  hrefPrefix,
  initial,
  signedIn,
}: {
  problems: ProblemSummary[]
  topics: readonly Topic[]
  tags: readonly string[]
  stats: Record<string, Stat>
  solved: string[]
  tried: string[]
  daily: string | null
  /** "/p/" on code.krpex.in, "/code/p/" elsewhere. */
  hrefPrefix: string
  initial: TableFilters
  signedIn: boolean
}) {
  const router = useRouter()
  const [f, setF] = useState<TableFilters>(initial)
  const solvedSet = useMemo(() => new Set(solved), [solved])
  const triedSet = useMemo(() => new Set(tried), [tried])
  const status = (slug: string) => (solvedSet.has(slug) ? "solved" : triedSet.has(slug) ? "tried" : "todo")

  function update(patch: Partial<TableFilters>) {
    const next = { ...f, ...patch }
    setF(next)
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v && !(k === "sort" && v === "number")) params.set(k, v)
    const qs = params.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`)
  }

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const list = problems.filter(
      (p) =>
        (!q || p.title.toLowerCase().includes(q) || String(p.number) === q || p.tags.some((t) => t.toLowerCase() === q)) &&
        (!f.difficulty || p.difficulty === f.difficulty) &&
        (!f.status || status(p.slug) === f.status) &&
        (!f.tag || p.tags.includes(f.tag as never)) &&
        (!f.topic || p.topic === f.topic),
    )
    const by: Record<Sort, (a: ProblemSummary, b: ProblemSummary) => number> = {
      number: (a, b) => a.number - b.number,
      difficulty: (a, b) => DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty] || a.number - b.number,
      acceptance: (a, b) => (acceptance(stats[b.slug]) ?? -1) - (acceptance(stats[a.slug]) ?? -1) || a.number - b.number,
      title: (a, b) => a.title.localeCompare(b.title),
    }
    return [...list].sort(by[f.sort])
    // status() reads the memoised sets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problems, f, stats, solvedSet, triedSet])

  function pickOne() {
    const pool = rows.filter((p) => status(p.slug) !== "solved")
    const from = pool.length ? pool : rows.length ? rows : problems
    const p = from[Math.floor(Math.random() * from.length)]
    router.push(`${hrefPrefix}${p.slug}`)
  }

  const dailyRow = daily ? problems.find((p) => p.slug === daily) : undefined
  const filtered = Boolean(f.q || f.difficulty || f.status || f.tag || f.topic)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of problems) c[p.topic] = (c[p.topic] ?? 0) + 1
    return c
  }, [problems])

  return (
    <div>
      {/* Topics as chips: the learning path, in order. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Topics">
        <Chip active={!f.topic} onClick={() => update({ topic: "" })}>
          All topics
        </Chip>
        {topics.map((t) => (
          <Chip key={t} active={f.topic === t} onClick={() => update({ topic: f.topic === t ? "" : t })}>
            {t} <span className="text-muted-foreground">{counts[t] ?? 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Search problems</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={f.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search by title, number or tag"
            className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </label>
        <Select label="Difficulty" value={f.difficulty} onChange={(v) => update({ difficulty: v as TableFilters["difficulty"] })}>
          <option value="">Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
        {signedIn && (
          <Select label="Status" value={f.status} onChange={(v) => update({ status: v as TableFilters["status"] })}>
            <option value="">Status</option>
            <option value="todo">To do</option>
            <option value="tried">Attempted</option>
            <option value="solved">Solved</option>
          </Select>
        )}
        <Select label="Tag" value={f.tag} onChange={(v) => update({ tag: v })}>
          <option value="">Tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select label="Sort by" value={f.sort} onChange={(v) => update({ sort: v as Sort })}>
          <option value="number">Sort: number</option>
          <option value="difficulty">Sort: difficulty</option>
          <option value="acceptance">Sort: acceptance</option>
          <option value="title">Sort: title</option>
        </Select>
        <button
          type="button"
          onClick={pickOne}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <IconShuffle /> Pick one
        </button>
      </div>

      {filtered && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {rows.length} of {problems.length} problems
          </span>
          <button type="button" onClick={() => update({ q: "", difficulty: "", status: "", tag: "", topic: "" })} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground">
            <IconX width={14} height={14} /> Clear filters
          </button>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        <table className="w-full table-fixed text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-11 py-2.5 pl-4 font-medium">
                <span className="sr-only">Status</span>
              </th>
              <th scope="col" className="py-2.5 font-medium">
                Title
              </th>
              <th scope="col" className="hidden w-[30%] py-2.5 font-medium xl:table-cell">
                Tags
              </th>
              <th scope="col" className="hidden w-28 py-2.5 text-right font-medium sm:table-cell">
                Acceptance
              </th>
              <th scope="col" className="w-24 py-2.5 pr-4 text-right font-medium">
                Difficulty
              </th>
            </tr>
          </thead>
          <tbody>
            {dailyRow && !filtered && f.sort === "number" && (
              <Row p={dailyRow} state={status(dailyRow.slug)} stat={stats[dailyRow.slug]} href={`${hrefPrefix}${dailyRow.slug}`} daily />
            )}
            {rows.map((p) => (
              <Row key={p.slug} p={p} state={status(p.slug)} stat={stats[p.slug]} href={`${hrefPrefix}${p.slug}`} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No problems match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({ p, state, stat, href, daily }: { p: ProblemSummary; state: "solved" | "tried" | "todo"; stat?: Stat; href: string; daily?: boolean }) {
  const rate = acceptance(stat)
  return (
    <tr className={cn("group relative border-b last:border-0 even:bg-muted/30 hover:bg-muted/60", daily && "bg-primary/5 even:bg-primary/5")}>
      <td className="py-2.5 pl-4">
        {daily ? (
          <IconCalendar className="text-primary" aria-label="Problem of the day" role="img" aria-hidden={false} />
        ) : state === "solved" ? (
          <IconCircleCheck className="text-teal-600 dark:text-teal-400" aria-label="Solved" role="img" aria-hidden={false} />
        ) : state === "tried" ? (
          <IconDot className="text-amber-600 dark:text-amber-400" aria-label="Attempted" role="img" aria-hidden={false} />
        ) : null}
      </td>
      <td className="truncate py-2.5 pr-3">
        {/* The whole row is the link's hit area. */}
        <Link href={href} className="font-medium after:absolute after:inset-0 group-hover:text-primary">
          {p.number}. {p.title}
        </Link>
        {daily && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Today · 2× XP</span>}
        {daily && state === "solved" && <span className="ml-1 text-xs text-teal-600 dark:text-teal-400">✓</span>}
      </td>
      <td className="hidden truncate py-2.5 pr-3 text-xs text-muted-foreground xl:table-cell">{p.tags.join(" · ")}</td>
      <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell" title={stat ? `${stat.accepted} accepted of ${stat.submissions} submissions` : undefined}>
        {rate === null ? "—" : `${(rate * 100).toFixed(1)}%`}
      </td>
      <td className="py-2.5 pr-4 text-right">
        <DifficultyText difficulty={p.difficulty} />
      </td>
    </tr>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background [&_span]:text-background/70" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 cursor-pointer rounded-lg border bg-card px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          value && value !== "number" ? "border-primary/50 text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
      </select>
    </label>
  )
}
