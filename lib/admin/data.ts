import { cache } from "react"
import { notFound } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// Admin data, one loader per RPC. Wrapped in React's cache() so the layout and a section that need the same
// data in one request share a single call. Every RPC also checks require_admin in the database.

export type Overview = Record<string, number>
export type Day = { day: string; signups: number; courses: number; lessons: number; questions: number; ai_inr: string; revenue_paise: number }
export type UserRow = {
  id: string
  email: string
  full_name: string | null
  handle: string | null
  created_at: string
  last_sign_in_at: string | null
  plan: string
  credits: number
  courses: number
  level: number
  solved: number
  banned: boolean
}
export type UserFilters = { search: string; plan: "all" | "free" | "pro"; active: "all" | "7d" | "30d" | "quiet"; sort: "joined" | "seen"; page: number }
export const USERS_PER_PAGE = 50

export type AuditRow = { at: string; admin: string | null; action: string; user_id: string | null; email: string | null; detail: Record<string, unknown> }

/** Everything about one learner (admin_user, migration 036). */
export type AdminUser = {
  account: {
    id: string
    email: string
    full_name: string | null
    created_at: string
    last_sign_in_at: string | null
    email_confirmed_at: string | null
    providers: string[]
    admin: boolean
    professor: { id: string; status: string; name: string } | null
  }
  learner: { goal: string; level: string; language: string; hours_per_week: number | null } | null
  plan: { plan: string; status: string | null; period_end: string | null }
  credits: number
  ledger: { delta: number; reason: string; note: string | null; ref: string | null; created_at: string }[]
  xp: { total: number; level: number; week: number; last: string | null }
  courses: { id: string; title: string; category: string | null; status: string; language: string; created_at: string; lessons: number; passed: number; last_passed: string | null; certificate: string | null }[]
  ai: { lessons_written: number; courses_created: number; questions: number; questions_30d: number; coach: number; coach_30d: number }
  payments: { created_at: string; paid_at: string | null; product: string; amount_paise: number; status: string; razorpay_payment_id: string | null }[]
  code: {
    solved: number
    submissions: number
    plans: number
    recent: { problem: string; title: string; language: string; passed: number; total: number; solved: boolean; created_at: string }[]
  }
  community: {
    profile: { handle: string; display_name: string; is_public: boolean; hidden: boolean } | null
    ban: { until: string | null; reason: string | null; at: string } | null
    posts: number
    comments: number
    removed: number
    reports_received: number
    reports_made: number
    recent: { id: string; title: string; kind: string; status: string; score: number; comment_count: number; created_at: string; path: string }[]
  }
  lesson_reports: { reason: string; details: string | null; status: string; created_at: string; lesson: string }[]
  audit: AuditRow[]
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
  author_id: string | null
  author_email: string | null
  created_at: string
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
export type MoneyDays = 7 | 30 | 90
export type Money = {
  days: MoneyDays
  rate: { usd_inr: number; updated_at: string; by: string | null }
  prices: { model: string; in: number; out: number }[]
  revenue_paise: number
  paid_orders: number
  paying_learners: number
  unpaid_orders: number
  ai_inr: number
  ai_calls: number
  ai_unpriced: number
  pro_active: number
  credits_outstanding: number
  daily: { day: string; revenue_paise: number; orders: number; ai_inr: number; ai_calls: number }[]
  features: { feature: string; calls: number; tokens_in: number; tokens_out: number; inr: number }[]
  models: { model: string; calls: number; tokens_in: number; tokens_out: number; inr: number; priced: boolean }[]
  learners: { user_id: string; email: string | null; calls: number; inr: number; paid_paise: number }[]
  unattributed_inr: number
  credits: { reason: string; added: number; used: number; entries: number }[]
}
export const getMoney = cache((days: MoneyDays) => rpc<Money | null>("admin_money", { p_days: days }, null))

export type PaymentStatus = "all" | "paid" | "created" | "failed"
export type PaymentRow = Payment & { user_id: string | null; razorpay_order_id: string | null }
export const PAYMENTS_PER_PAGE = 50
export const getPaymentList = cache(async (status: PaymentStatus, page: number) => {
  const r = await rpc<{ total?: number; rows?: PaymentRow[] }>(
    "admin_payment_list",
    { p_status: status, p_limit: PAYMENTS_PER_PAGE, p_offset: (page - 1) * PAYMENTS_PER_PAGE },
    {},
  )
  return { data: { total: r.data.total ?? 0, rows: r.data.rows ?? [] }, error: r.error }
})

export type CodeStats = {
  days: MoneyDays
  submissions: number
  accepted: number
  learners: number
  solvers: number
  problems_solved: number
  problems_active: number
  languages: Record<string, number>
  daily: { day: string; submissions: number; accepted: number; learners: number; coach: number }[]
  problems: { slug: string; title: string; topic: string; difficulty: string; active: boolean; submissions: number; accepted: number; tried: number; solvers: number; reveals: number; coach: number }[]
  stuck: { slug: string; title: string; difficulty: string; tried: number; solvers: number; reveals: number }[]
  never_tried: { slug: string; title: string; difficulty: string }[]
  coach: { requests: number; learners: number; failed: number; paid: number; inr: number; kinds: { kind: string; requests: number; answered: number; failed: number; paid: number }[] }
  runner_errors: { message: string; count: number; last: string; path: string | null; detail: string | null }[]
}
export const getCode = cache((days: MoneyDays) => rpc<CodeStats | null>("admin_code", { p_days: days }, null))

export type UserAi = { inr: number; inr_30d: number; calls: number; features: { feature: string; calls: number; inr: number; inr_30d: number }[] }
export const getUserAi = cache((id: string) => rpc<UserAi | null>("admin_user_ai", { p_user: id }, null))
export const getReports = cache(() => rpc<Report[]>("admin_reports", { p_status: "open" }, []))
export const getErrors = cache(() => rpc<ErrorGroup[]>("admin_errors", { p_hours: 24 }, []))
export const getReviewLessons = cache(() => rpc<AdminReviewLesson[]>("admin_review_lessons", undefined, []))
export type QueueShow = "all" | "reported" | "hidden"
export const getCommunityQueue = cache((show: QueueShow = "all") => rpc<CommunityItem[]>("admin_community_queue", { p_show: show }, []))
export type CommunityBan = { user_id: string; handle: string | null; email: string | null; until: string | null; reason: string | null; by: string | null; at: string }
export type AdminBoard = { slug: string; kind: "general" | "course"; title: string; active: boolean; posts: number; hidden: number; last_activity: string | null }
export const COMMUNITY_LOG_PER_PAGE = 50
export const getCommunityBans = cache(() => rpc<CommunityBan[]>("admin_community_bans", undefined, []))
export const getCommunityLog = cache((page: number) =>
  rpc<AuditRow[]>("admin_community_log", { p_limit: COMMUNITY_LOG_PER_PAGE + 1, p_offset: (page - 1) * COMMUNITY_LOG_PER_PAGE }, []),
)
export const getAdminBoards = cache(() => rpc<AdminBoard[]>("admin_community_boards", undefined, []))
export const getProfessors = cache(async (): Promise<Loaded<{ professors: AdminProfessor[]; invites: AdminInvite[] }>> => {
  const r = await rpc<{ professors?: AdminProfessor[]; invites?: AdminInvite[] }>("admin_professors", undefined, {})
  return { data: { professors: r.data.professors ?? [], invites: r.data.invites ?? [] }, error: r.error }
})

export const getUserList = cache(async (f: UserFilters) => {
  const r = await rpc<{ total?: number; rows?: UserRow[] }>(
    "admin_user_list",
    { p_search: f.search.slice(0, 100), p_plan: f.plan, p_active: f.active, p_sort: f.sort, p_limit: USERS_PER_PAGE, p_offset: (f.page - 1) * USERS_PER_PAGE },
    {},
  )
  return { data: { total: r.data.total ?? 0, rows: r.data.rows ?? [] }, error: r.error }
})
export const getUser = cache((id: string) => rpc<AdminUser | null>("admin_user", { p_user: id }, null))
export const getAudit = cache((limit: number) => rpc<AuditRow[]>("admin_audit", { p_limit: limit, p_offset: 0 }, []))
