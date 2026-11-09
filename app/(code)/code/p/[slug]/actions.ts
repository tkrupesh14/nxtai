"use server"

import { headers } from "next/headers"

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
