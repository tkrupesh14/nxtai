"use server"

import type { CodeLanguage } from "@/lib/code/harness"
import { problemBySlug } from "@/lib/code/problems"
import { createClient } from "@/lib/supabase/server"

export type SubmitResult =
  | { solved: boolean; xp: number; firstTry: boolean; daily: boolean }
  | { error: "sign_in" | "rate_limited" | "failed" }

/** Saves a submission graded in the learner's browser; the database pays XP (migration 028). */
export async function submitSolutionAction(slug: string, language: CodeLanguage, code: string, passed: number): Promise<SubmitResult> {
  const problem = problemBySlug(slug)
  if (!problem || (language !== "python" && language !== "javascript") || typeof code !== "string") return { error: "failed" }
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: "sign_in" }
  const { data, error } = await supabase.rpc("submit_code", {
    p_problem: slug,
    p_language: language,
    p_code: code,
    p_passed: Math.trunc(Number(passed)) || 0,
    p_total: problem.tests.length,
  })
  if (error) return { error: /rate_limited/.test(error.message) ? "rate_limited" : /not_signed_in/.test(error.message) ? "sign_in" : "failed" }
  const r = data as { solved: boolean; xp: number; first_try: boolean; daily: boolean }
  return { solved: r.solved, xp: Number(r.xp) || 0, firstTry: r.first_try, daily: r.daily }
}
