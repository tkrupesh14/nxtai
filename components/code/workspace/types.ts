import type { SubmitResult } from "@/app/(code)/code/p/[slug]/actions"
import type { CaseResult, CodeLanguage } from "@/lib/code/harness"
import type { ProblemSummary, PublicProblem } from "@/lib/code/problems"
import type { RunSummary } from "@/lib/code/verdict"

export type ListItem = ProblemSummary & { state: "solved" | "tried" | "todo" }

export type Stats = { submissions: number; accepted: number; solvers: number; attempters: number }

export type SavedSubmission = {
  id: number
  language: CodeLanguage
  code: string
  passed: number
  total: number
  solved: boolean
  xp: number
  runtime_ms: number | null
  created_at: string
}

export type ExpectedInfo = { known: true; value: unknown } | { known: false; reason: string }

/** One test case after a Run: its arguments, what came back and what was expected. */
export type CaseRun = { args: unknown[]; result: CaseResult | null; expected: ExpectedInfo }

export type RunOutcome = { lang: CodeLanguage; summary: RunSummary; cases: CaseRun[]; errorText: string }

export type SubmitOutcome = {
  lang: CodeLanguage
  summary: RunSummary
  /** The first failing test, shown in full (even a hidden one). */
  failing: (CaseRun & { index: number; hidden: boolean }) | null
  errorText: string
  save: SubmitResult | "saving" | null
}

export type WorkspaceProblem = PublicProblem
