import type { Difficulty } from "@/lib/code/problems"
import { cn } from "@/lib/utils"

const STYLE: Record<Difficulty, string> = {
  easy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", STYLE[difficulty])}>{difficulty}</span>
}
