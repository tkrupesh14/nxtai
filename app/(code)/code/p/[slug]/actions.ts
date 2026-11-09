"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"

import { AIError, coachCode, PRICE_PER_M, type CoachMode } from "@/lib/ai/llm"
import { COACH_LIMITS, COACH_MESSAGES, revealsSolution, withoutCode, type CoachAllowance, type CoachKind, type CoachResult, type FailingCase } from "@/lib/code/coach"
import type { CodeLanguage } from "@/lib/code/harness"
import { problemBySlug, type Editorial } from "@/lib/code/problems"
import { allowCheck, expectedFor, validCases, type Expected } from "@/lib/code/reference"
import { createClient } from "@/lib/supabase/server"

export type SubmitResult =
  | { solved: boolean; xp: number; firstTry: boolean; daily: boolean; revealed: boolean; id: number }
  | { error: "sign_in" | "rate_limited" | "failed" }

/** Saves a submission graded in the learner's browser; the database pays XP (migrations 028–029). */
export async function submitSolutionAction(slug: string, language: CodeLanguage, code: string, passed: number, runtimeMs?: number | null): Promise<SubmitResult> {
  const problem = problemBySlug(slug)
  if (!problem || (language !== "python" && language !== "javascript") || typeof code !== "string") return { error: "failed" }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: "sign_in" }
  const ms = Number(runtimeMs)
  const { data, error } = await supabase.rpc("submit_code", {
    p_problem: slug,
    p_language: language,
    p_code: code,
    p_passed: Math.trunc(Number(passed)) || 0,
    p_total: problem.tests.length,
    p_runtime_ms: Number.isFinite(ms) && ms >= 0 ? Math.min(600_000, Math.round(ms)) : null,
  })
  if (error) return { error: /rate_limited/.test(error.message) ? "rate_limited" : /not_signed_in/.test(error.message) ? "sign_in" : "failed" }
  const r = data as { id: number; solved: boolean; xp: number; first_try: boolean; daily: boolean; revealed?: boolean }
  return { id: r.id, solved: r.solved, xp: Number(r.xp) || 0, firstTry: r.first_try, daily: r.daily, revealed: Boolean(r.revealed) }
}

export type RevealResult = { python: string; javascript: string; editorial: Editorial | null } | { error: "failed" }

/** The official solution. For a signed-in learner who hasn't solved it yet, the problem then pays no XP. */
export async function revealSolutionAction(slug: string): Promise<RevealResult> {
  const problem = problemBySlug(slug)
  if (!problem) return { error: "failed" }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (auth.user) {
    const { error } = await supabase.rpc("reveal_coding_solution", { p_problem: slug })
    if (error) return { error: "failed" }
  }
  return { ...problem.solution, editorial: problem.editorial ?? null }
}

export type ExpectedResult = { expected: Expected[] } | { error: "bad_input" | "too_slow" | "rate_limited" }

/** "Expected" for the learner's own test cases, from our reference solution (lib/code/reference.ts). */
export async function expectedAction(slug: string, cases: unknown): Promise<ExpectedResult> {
  const problem = problemBySlug(slug)
  if (!problem || !validCases(problem, cases)) return { error: "bad_input" }
  const h = await headers()
  const who = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (!allowCheck(who)) return { error: "rate_limited" }
  const expected = await expectedFor(problem, cases)
  return expected ? { expected } : { error: "too_slow" }
}

const DAILY_BUDGET_USD = Number(process.env.PROFESSOR_DAILY_BUDGET_USD || 2)

function cleanFailing(f: unknown): FailingCase | null {
  if (!f || typeof f !== "object") return null
  const o = f as Record<string, unknown>
  const field = (v: unknown) => (typeof v === "string" ? v.slice(0, COACH_LIMITS.maxField) : undefined)
  const input = field(o.input)
  if (!input) return null
  return { input, expected: field(o.expected), got: field(o.got), error: field(o.error), printed: field(o.printed) }
}

/**
 * The AI coach (v2 Phase 3): a hint (steps 1–3, never the solution), an explanation of a failing test, or a review
 * once solved. Order matters for cost: input checks, a free repeat from history, the global spend cap, the
 * per-user allowance or credit (atomic, in Postgres), then the AI call. The code goes to the AI provider only here.
 */
export async function coachAction(
  slug: string,
  input: { kind: string; step?: number; language: string; code: string; failing?: unknown },
): Promise<CoachResult> {
  if (process.env.CODING_COACH === "off") return { ok: false, message: COACH_MESSAGES.paused }
  const problem = problemBySlug(slug)
  if (!problem) return { ok: false, message: COACH_MESSAGES.not_found }
  const kind = (["hint", "error", "review"] as const).find((k) => k === input?.kind) as CoachKind | undefined
  const language = input?.language === "python" || input?.language === "javascript" ? input.language : null
  const step = kind === "hint" ? Math.trunc(Number(input.step)) : 0
  if (!kind || !language || (kind === "hint" && !(step >= 1 && step <= 3))) return { ok: false, message: COACH_MESSAGES.bad_request }
  const code = typeof input.code === "string" ? input.code.replace(/[ \t]+$/gm, "").trimEnd() : ""
  if (!code.trim()) return { ok: false, message: COACH_MESSAGES.no_code }
  if (code.length > COACH_LIMITS.maxCode) return { ok: false, message: COACH_MESSAGES.too_long }
  const failing = kind === "error" ? cleanFailing(input.failing) : null
  if (kind === "error" && !failing) return { ok: false, message: "Run your code first — this explains a failing test." }

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { ok: false, message: COACH_MESSAGES.auth }

  // Asking exactly the same thing again (same code, same test) is free.
  const fingerprint = createHash("sha256").update(JSON.stringify([kind, step, language, code, failing])).digest("hex")
  const { data: past } = await supabase
    .from("coding_coach_requests")
    .select("id, kind, step, reply, created_at")
    .eq("problem", slug)
    .eq("kind", kind)
    .eq("step", step)
    .eq("fingerprint", fingerprint)
    .eq("status", "answered")
    .limit(1)
  if (past?.length) return { ok: true, cached: true, paid: false, turn: past[0] as Extract<CoachResult, { ok: true }>["turn"], allowance: null }

  // Global safety net across all learners (shared with Ask the professor).
  const { data: spend } = await supabase.rpc("professor_tokens_today").single<{ tokens_in: number; tokens_out: number }>()
  const usd = spend ? (Number(spend.tokens_in) * PRICE_PER_M.input + Number(spend.tokens_out) * PRICE_PER_M.output) / 1e6 : 0
  if (usd >= DAILY_BUDGET_USD) {
    console.warn(`AI daily budget reached (coach): $${usd.toFixed(3)}`)
    return { ok: false, message: COACH_MESSAGES.busy_day }
  }

  const { data: credit, error: creditError } = await supabase
    .rpc("take_coach_credit", { p_problem: slug, p_kind: kind, p_step: step, p_fingerprint: fingerprint })
    .single<{ request_id: string | null; reason: string | null; used_today: number; daily: number; paid: boolean; credits_left: number }>()
  if (creditError || !credit) {
    console.error("take_coach_credit failed:", creditError?.message)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
  const allowance: CoachAllowance = { usedToday: credit.used_today, daily: credit.daily, credits: credit.credits_left }
  if (!credit.request_id) return { ok: false, message: COACH_MESSAGES[credit.reason ?? ""] ?? "Please try again later.", allowance: credit.daily ? allowance : undefined }
  const requestId = credit.request_id

  try {
    // Earlier hints for this problem, one per step below this one, so each hint builds on the last.
    let earlierHints: string[] = []
    if (kind === "hint" && step > 1) {
      const { data: hints } = await supabase
        .from("coding_coach_requests")
        .select("step, reply")
        .eq("problem", slug)
        .eq("kind", "hint")
        .eq("status", "answered")
        .lt("step", step)
        .order("created_at", { ascending: false })
        .limit(10)
      const byStep = new Map<number, string>()
      for (const h of hints ?? []) if (!byStep.has(h.step) && h.reply) byStep.set(h.step, h.reply)
      earlierHints = [...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r.slice(0, 800))
    }
    const solution = problem.solution[language]
    const mode: CoachMode = kind === "hint" ? (`hint${step}` as CoachMode) : kind
    const ask = (strict: boolean) =>
      coachCode({
        mode,
        title: problem.title,
        statement: problem.statement,
        difficulty: problem.difficulty,
        language,
        code,
        referenceSolution: solution,
        idea: problem.editorial?.idea,
        failing: failing ?? undefined,
        earlierHints,
        strict,
      })
    let { reply, usage } = await ask(false)
    let text = reply.reply.trim()
    // Hints and error help never hand over the solution: ask again more strictly, then strip code if needed.
    if (kind !== "review" && revealsSolution(text, solution)) {
      const retry = await ask(true)
      usage = { input: usage.input + retry.usage.input, output: usage.output + retry.usage.output }
      reply = retry.reply
      text = reply.reply.trim()
      if (revealsSolution(text, solution)) text = withoutCode(text)
      if (revealsSolution(text, solution)) text = "I'd be giving the answer away there. Try the hints on the Description tab, or ask for the next hint."
    }
    text = text.slice(0, 8000)
    const { data: saved, error } = await supabase
      .from("coding_coach_requests")
      .update({ reply: text, status: "answered", tokens_in: Math.min(usage.input, 30000), tokens_out: Math.min(usage.output, 4000) })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id, kind, step, reply, created_at")
    if (error || !saved?.length) throw new Error(`saving coach reply failed: ${error?.message ?? "row not pending"}`)
    return { ok: true, cached: false, paid: credit.paid, turn: saved[0] as Extract<CoachResult, { ok: true }>["turn"], allowance }
  } catch (e) {
    console.error("coach answer failed:", e instanceof Error ? e.message : e)
    await supabase.from("coding_coach_requests").update({ status: "failed" }).eq("id", requestId).eq("status", "pending")
    return {
      ok: false,
      message: (e instanceof AIError ? e.userMessage : "The coach couldn't answer just now. Please try again.") + (credit.paid ? " Credits for failed answers are refunded (up to 2 a day)." : ""),
      allowance,
    }
  }
}
