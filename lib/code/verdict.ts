// Krpex Code v2: turning a run into a verdict, and the learner's editable test cases. Pure, client-safe.

import type { CaseResult, HarnessResult } from "@/lib/code/harness"

export type Verdict = "accepted" | "wrong" | "runtime_error" | "time_limit" | "error" | "missing" | "stopped"

export const VERDICT_LABEL: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong: "Wrong answer",
  runtime_error: "Runtime error",
  time_limit: "Time limit exceeded",
  error: "Error",
  missing: "Function not found",
  stopped: "Stopped",
}

export type RunSummary = {
  verdict: Verdict
  passed: number
  total: number
  /** Time spent inside the learner's function across all tests, in ms (null when it didn't finish). */
  runtimeMs: number | null
  /** Index of the first failing test, if any. */
  firstFail: number | null
}

export function summarise(status: "done" | "timeout" | "stopped", result: HarnessResult, total: number): RunSummary {
  if (status === "timeout") return { verdict: "time_limit", passed: 0, total, runtimeMs: null, firstFail: null }
  if (status === "stopped") return { verdict: "stopped", passed: 0, total, runtimeMs: null, firstFail: null }
  if (result.kind === "missing") return { verdict: "missing", passed: 0, total, runtimeMs: null, firstFail: null }
  if (result.kind === "none") return { verdict: "error", passed: 0, total, runtimeMs: null, firstFail: null }
  const rs: CaseResult[] = result.results
  const passed = rs.filter((r) => r.ok).length
  const firstFail = rs.findIndex((r) => !r.ok)
  const runtimeMs = Math.round(rs.reduce((s, r) => s + (r.ms ?? 0), 0) * 10) / 10
  if (firstFail < 0) return { verdict: "accepted", passed, total: rs.length, runtimeMs, firstFail: null }
  return { verdict: rs[firstFail].error ? "runtime_error" : "wrong", passed, total: rs.length, runtimeMs, firstFail }
}

/** One editable test case: the JSON text of each argument. */
export type CaseDraft = { args: string[] }

export const toDraft = (args: unknown[]): CaseDraft => ({ args: args.map((a) => JSON.stringify(a)) })

export type ParsedCases = { ok: true; cases: unknown[][] } | { ok: false; caseIndex: number; argIndex: number; message: string }

/** Parses every argument as JSON; the first problem is reported with where it is. */
export function parseCases(drafts: CaseDraft[]): ParsedCases {
  const cases: unknown[][] = []
  for (let i = 0; i < drafts.length; i++) {
    const args: unknown[] = []
    for (let j = 0; j < drafts[i].args.length; j++) {
      const text = drafts[i].args[j].trim()
      if (!text) return { ok: false, caseIndex: i, argIndex: j, message: "Enter a value (JSON, for example 3, \"text\", [1, 2] or true)." }
      try {
        args.push(JSON.parse(text))
      } catch {
        return { ok: false, caseIndex: i, argIndex: j, message: "This isn't valid JSON. Strings need double quotes; use true/false/null." }
      }
    }
    cases.push(args)
  }
  return { ok: true, cases }
}

/** The expected answer when the case is one of the problem's examples, unchanged. */
export function knownExpected(args: unknown[], samples: { args: unknown[]; expected: unknown }[]) {
  const key = JSON.stringify(args)
  const hit = samples.find((s) => JSON.stringify(s.args) === key)
  return hit ? { found: true as const, value: hit.expected } : { found: false as const }
}
