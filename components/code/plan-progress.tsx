import { cn } from "@/lib/utils"

/** A labelled progress bar for a study plan. */
export function PlanProgress({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground tabular-nums">{done}</span> / {total} solved
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Plan progress">
        <div className={cn("h-full rounded-full", done >= total && total > 0 ? "bg-teal-500" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
