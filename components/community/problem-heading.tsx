import Link from "next/link"

import { DifficultyBadge } from "@/components/code/difficulty-badge"
import type { ProblemSummary } from "@/lib/code/problems"
import type { PostKind, Section } from "@/lib/community/posts"
import { cn } from "@/lib/utils"

/** Problem title, a link to solve it on Krpex Code, and the Solutions / Discussion tabs. */
export function ProblemHeading({
  problem,
  section,
  counts,
  base,
  solveHref,
}: {
  problem: ProblemSummary
  section: Section | null
  counts: Record<PostKind, number>
  /** "/p/two-sum" on community.krpex.in */
  base: string
  solveHref: string
}) {
  const tabs: { s: Section; label: string; n: number }[] = [
    { s: "solutions", label: "Solutions", n: counts.solution },
    { s: "discuss", label: "Discussion", n: counts.discussion },
  ]
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <DifficultyBadge difficulty={problem.difficulty} />
            {problem.topic}
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
            {problem.number}. {problem.title}
          </h1>
        </div>
        <a href={solveHref} className="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:border-primary/50">
          Solve on Krpex Code →
        </a>
      </div>
      <nav aria-label="Community sections" className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.s}
            href={`${base}/${t.s}`}
            aria-current={section === t.s ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              section === t.s ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label} <span className="tabular-nums text-muted-foreground">{t.n}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
