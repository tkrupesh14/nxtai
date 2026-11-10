import { cn } from "@/lib/utils"

/** "L6" next to a learner's name (community). Text and border only, so it reads in both themes. */
export function LevelBadge({ level, className }: { level: number; className?: string }) {
  return (
    <span
      title={`Level ${level}`}
      aria-label={`Level ${level}`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[11px] font-semibold tabular-nums leading-4",
        level >= 10 ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
        className,
      )}
    >
      L{level}
    </span>
  )
}
