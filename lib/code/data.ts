import "server-only"

import type { CodeLanguage } from "@/lib/code/harness"
import { createClient } from "@/lib/supabase/server"

// Krpex Code reads (migration 028). Each returns an empty answer if the migration isn't applied yet.

/** Slug of today's problem (IST), or null. */
export async function getDailyProblem(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("coding_daily_problem")
  return error || typeof data !== "string" ? null : data
}

/** The signed-in learner's problems: solved, and tried but not solved yet. */
export async function getMyProgress(): Promise<{ solved: Set<string>; tried: Set<string> }> {
  const supabase = await createClient()
  const { data } = await supabase.from("coding_submissions").select("problem, solved").limit(5000)
  const solved = new Set<string>()
  const tried = new Set<string>()
  for (const r of (data ?? []) as { problem: string; solved: boolean }[]) (r.solved ? solved : tried).add(r.problem)
  for (const s of solved) tried.delete(s)
  return { solved, tried }
}

export type MySubmission = { id: number; language: CodeLanguage; code: string; passed: number; total: number; solved: boolean; xp: number; created_at: string }

/** The learner's latest submissions for one problem, newest first. */
export async function getMySubmissions(slug: string, limit = 10): Promise<MySubmission[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("coding_submissions")
    .select("id, language, code, passed, total, solved, xp, created_at")
    .eq("problem", slug)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as MySubmission[]
}
