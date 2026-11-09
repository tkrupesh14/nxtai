import type { Difficulty } from "@/lib/code/problems"
import { cn } from "@/lib/utils"

export const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  easy: "text-teal-600 dark:text-teal-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-rose-600 dark:text-rose-400",
}
const DIFFICULTY_BG: Record<Difficulty, string> = {
  easy: "bg-teal-500/10",
  medium: "bg-amber-500/10",
  hard: "bg-rose-500/10",
}
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", DIFFICULTY_TEXT[difficulty], DIFFICULTY_BG[difficulty], className)}>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  )
}

/** Plain coloured text, for dense tables. */
export function DifficultyText({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return <span className={cn("text-sm font-medium", DIFFICULTY_TEXT[difficulty], className)}>{DIFFICULTY_LABEL[difficulty]}</span>
}
