import "server-only"

import type { CodeLanguage } from "@/lib/code/harness"
import { createClient } from "@/lib/supabase/server"

// Krpex Code reads (migrations 028–029). Each returns an empty answer if a migration isn't applied yet.

/** Slug of today's problem (IST), or null. */
export async function getDailyProblem(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("coding_daily_problem")
  return error || typeof data !== "string" ? null : data
}

export type ProblemStats = { submissions: number; accepted: number; solvers: number; attempters: number }

/** Totals per problem (no learners), for acceptance rates. */
export async function getProblemStats(): Promise<Record<string, ProblemStats>> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("coding_problem_stats")
  const out: Record<string, ProblemStats> = {}
  for (const r of (data ?? []) as ({ slug: string } & ProblemStats)[])
    out[r.slug] = { submissions: r.submissions, accepted: r.accepted, solvers: r.solvers, attempters: r.attempters }
  return out
}

export type MyProgress = {
  solved: string[]
  tried: string[]
  /** Submissions per IST day (YYYY-MM-DD), last 26 weeks. */
  activity: Record<string, number>
}

/** The signed-in learner's problems (solved, tried but not solved yet) and recent activity. */
export async function getMyProgress(): Promise<MyProgress> {
  const supabase = await createClient()
  const { data } = await supabase.from("coding_submissions").select("problem, solved, created_at").order("created_at", { ascending: false }).limit(5000)
  const solved = new Set<string>()
  const tried = new Set<string>()
  const activity: Record<string, number> = {}
  const since = Date.now() - 26 * 7 * 86_400_000
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
  for (const r of (data ?? []) as { problem: string; solved: boolean; created_at: string }[]) {
    ;(r.solved ? solved : tried).add(r.problem)
    const t = Date.parse(r.created_at)
    if (t >= since) {
      const d = day.format(t)
      activity[d] = (activity[d] ?? 0) + 1
    }
  }
  for (const s of solved) tried.delete(s)
  return { solved: [...solved], tried: [...tried], activity }
}

export type MySubmission = {
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

/** The learner's latest submissions for one problem, newest first. */
export async function getMySubmissions(slug: string, limit = 20): Promise<MySubmission[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("coding_submissions")
    .select("id, language, code, passed, total, solved, xp, runtime_ms, created_at")
    .eq("problem", slug)
    .order("created_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as MySubmission[]
}

/** Whether the learner has opened this problem's official solution. */
export async function hasRevealed(slug: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase.from("coding_reveals").select("problem").eq("problem", slug).maybeSingle()
  return Boolean(data)
}
