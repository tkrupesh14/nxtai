// Krpex Code AI coach (v2 Phase 3, plan.md "Krpex Code v2"). Client-safe: limits, messages, the request shape and
// the check that keeps hints from giving the solution away. Limits are enforced in Postgres (migration 031,
// take_coach_credit): free 3 a day, Pro 30 a day, then 1 credit each.

export type CoachKind = "hint" | "error" | "review"
export const HINT_STEPS = 3
export const COACH_DAILY = { free: 3, pro: 30 } as const
export const COACH_LIMITS = { maxCode: 8000, maxField: 1500 } as const

/** What the coach is shown about a failing test (strings, as the console displays them). */
export type FailingCase = { input: string; expected?: string; got?: string; error?: string; printed?: string }

export type CoachTurn = { id: string; kind: CoachKind; step: number; reply: string; created_at: string }

export type CoachAllowance = { usedToday: number; daily: number; credits: number }

export type CoachResult =
  | { ok: true; turn: CoachTurn; cached: boolean; paid: boolean; allowance: CoachAllowance | null }
  | { ok: false; message: string; allowance?: CoachAllowance }

export const COACH_MESSAGES: Record<string, string> = {
  auth: "Log in to use the AI coach.",
  not_found: "This problem isn't available.",
  bad_request: "Something went wrong. Please reload the page.",
  not_solved: "Solve the problem first — then the coach can review your solution.",
  slow_down: "One moment, please wait a few seconds between requests.",
  daily_limit: "You've used today's free coach answers. Recharge credits to keep going, or come back tomorrow.",
  paused: "The AI coach is paused right now.",
  busy_day: "The AI coach has had a very busy day. Please come back tomorrow.",
  no_code: "Write some code first.",
  too_long: `Your code is too long for the coach (over ${COACH_LIMITS.maxCode.toLocaleString("en-IN")} characters).`,
}

export function coachLabel(t: Pick<CoachTurn, "kind" | "step">) {
  return t.kind === "hint" ? `Hint ${t.step} of ${HINT_STEPS}` : t.kind === "error" ? "Your error, explained" : "Review of your solution"
}

/** The next hint step: one more than the highest so far, staying at the last step once reached. */
export const nextHintStep = (turns: Pick<CoachTurn, "kind" | "step">[]) =>
  Math.min(HINT_STEPS, Math.max(0, ...turns.filter((t) => t.kind === "hint").map((t) => t.step)) + 1)

const squash = (s: string) => s.replace(/\s+/g, " ").trim()

/**
 * Does a hint (or error explanation) give the solution away? True if it has a code block of 4+ lines, or repeats
 * a distinctive line of the reference solution. Reviews (after solving) may show code.
 */
export function revealsSolution(reply: string, solution: string) {
  for (const block of reply.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    if (block[1].split("\n").filter((l) => l.trim()).length >= 4) return true
  }
  const text = squash(reply)
  return solution
    .split("\n")
    .map(squash)
    .filter((l) => l.length >= 24 && !/^(def |function |return \w+$)/.test(l))
    .some((l) => text.includes(l))
}

/** Code blocks removed — the fallback when a retry still gives too much away. */
export const withoutCode = (reply: string) => reply.replace(/```[\s\S]*?```/g, "_(code left out — try writing this part yourself)_").trim()
