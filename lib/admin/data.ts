import { cache } from "react"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Admin data, one loader per RPC. Wrapped in React's cache() so the layout and a section that need the same
// data in one request share a single call. Every RPC also checks require_admin in the database.

export type Overview = Record<string, number>
export type Day = { day: string; signups: number; courses: number; lessons: number; questions: number; ai_usd: string; revenue_paise: number }
export type UserRow = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
  plan: string
  credits: number
  courses: number
  questions_7d: number
}
export type Payment = { created_at: string; paid_at: string | null; email: string; product: string; amount_paise: number; status: string; razorpay_payment_id: string | null }
export type ErrorGroup = { source: string; message: string; count: number; last_seen: string; last_path: string | null; last_detail: string | null }
export type Report = { id: string; created_at: string; email: string; course_id: string; course_title: string; lesson_title: string; reason: string; details: string | null }
export type AdminProfessor = {
  id: string
  email: string
  display_name: string
  title: string | null
  institution: string | null
  subject: string
  languages: string[]
  credentials: string | null
  status: string
  materials: number
  published: number
  pages: number
  lessons?: number
  lessons_published?: number
  recording_minutes_month?: number
  teaching_style?: string | null
  listing_requested?: boolean
  live?: boolean
}
export type AdminInvite = { id: string; email: string; subject: string; expires_at: string }
export type AdminReview = {
  professor: string
  accuracy: number
  clarity: number
  level_fit: number
  overall: number
  comment: string | null
  block_notes: { block: number; note: string; suggestion: string }[]
  updated_at: string
}
export type AdminReviewLesson = { id: string; title: string; level: string; language: string; status: string; created_at: string; blocks: number; reviews: AdminReview[] }
export type CommunityItem = {
  target: "post" | "comment"
  id: string
  path: string
  title: string
  body: string | null
  code: string | null
  status: string
  author: { handle: string; level: number } | { deleted: true }
  author_email: string | null
  reports: { reason: string; note: string | null; at: string }[]
}

/** Result of one loader: the rows, plus the error message if the call failed. */
export type Loaded<T> = { data: T; error: string | null }

async function rpc<T>(name: string, args: Record<string, unknown> | undefined, fallback: T): Promise<Loaded<T>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(name, args)
  if (error) console.error(`${name} failed:`, error.message)
  return { data: (data ?? fallback) as T, error: error?.message ?? null }
}

/** 404 for anyone who isn't an admin. */
export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.rpc("is_admin")
  if (data !== true) notFound()
})

export const getOverview = cache(() => rpc<Overview>("admin_overview", undefined, {}))
export const getDaily = cache((days: number) => rpc<Day[]>("admin_daily", { p_days: days }, []))
export const getUsers = cache((search: string) => rpc<UserRow[]>("admin_users", { p_search: search.slice(0, 100), p_limit: 50 }, []))
export const getPayments = cache(() => rpc<Payment[]>("admin_payments", { p_limit: 20 }, []))
export const getReports = cache(() => rpc<Report[]>("admin_reports", { p_status: "open" }, []))
export const getErrors = cache(() => rpc<ErrorGroup[]>("admin_errors", { p_hours: 24 }, []))
export const getReviewLessons = cache(() => rpc<AdminReviewLesson[]>("admin_review_lessons", undefined, []))
export const getCommunityQueue = cache(() => rpc<CommunityItem[]>("admin_community_queue", undefined, []))
export const getProfessors = cache(async (): Promise<Loaded<{ professors: AdminProfessor[]; invites: AdminInvite[] }>> => {
  const r = await rpc<{ professors?: AdminProfessor[]; invites?: AdminInvite[] }>("admin_professors", undefined, {})
  return { data: { professors: r.data.professors ?? [], invites: r.data.invites ?? [] }, error: r.error }
})
