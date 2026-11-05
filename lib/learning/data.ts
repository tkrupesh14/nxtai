import "server-only"

import { FREE_SUMMARY, type AccountSummary, type PlanId } from "@/lib/learning/plans"
import type { ChatTurn } from "@/lib/learning/professor"
import { createClient } from "@/lib/supabase/server"

export type LessonRow = {
  id: string
  course_id: string
  module_id: string
  position: number
  title: string
  objective: string
  est_minutes: number | null
  best_score: number | null
  attempts: number
  completed_at: string | null
  generated_at: string | null
  /** S numbers of the learner's material this lesson teaches from (courses built from uploads). */
  source_sections: number[] | null
}
export type ModuleRow = { id: string; course_id: string; position: number; title: string; summary: string }
export type CourseRow = {
  id: string
  title: string
  summary: string
  level: string
  estimated_weeks: number | null
  goal: string
  status: string
  created_at: string
  category: string | null
  subcategory: string | null
  professor: string | null
  welcome: string | null
  /** "en" or "hi" (migration 021). */
  language: string | null
}

const LESSON_COLUMNS =
  "id, course_id, module_id, position, title, objective, est_minutes, best_score, attempts, completed_at, generated_at, source_sections"

/** Lessons unlock in order: the first one, and any whose previous lesson is completed. */
export function isUnlocked(lessons: LessonRow[], index: number) {
  return index === 0 || Boolean(lessons[index - 1]?.completed_at)
}

export function progressOf(lessons: Pick<LessonRow, "completed_at">[]) {
  const done = lessons.filter((l) => l.completed_at).length
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 }
}

export async function listCourses() {
  const supabase = await createClient()
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, title, summary, level, estimated_weeks, goal, status, created_at, category, subcategory, professor, welcome, language")
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!courses?.length) return []

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, course_id, position, title, completed_at, best_score, est_minutes")
    .in("course_id", courses.map((c) => c.id))
    .order("position")
  if (lessonsError) throw lessonsError

  return (courses as CourseRow[]).map((course) => {
    const own = (lessons ?? []).filter((l) => l.course_id === course.id)
    const next = own.find((l) => !l.completed_at)
    const lastActive = own.reduce<string | null>((m, l) => (l.completed_at && (!m || l.completed_at > m) ? l.completed_at : m), null)
    return {
      ...course,
      lessons: own,
      lastActive,
      progress: progressOf(own),
      nextLesson: next ? { id: next.id, title: next.title } : null,
    }
  })
}

/** When the learner asked the professor questions (for streaks); most recent first, up to a year. */
export async function getQuestionTimes() {
  const supabase = await createClient()
  const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from("professor_questions")
    .select("created_at")
    .eq("status", "answered")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3000)
  return (data ?? []).map((r) => r.created_at as string)
}

export async function getCourse(courseId: string) {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, summary, level, estimated_weeks, goal, status, created_at, category, subcategory, professor, welcome, language")
    .eq("id", courseId)
    .maybeSingle()
  if (!course) return null

  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("course_modules").select("id, course_id, position, title, summary").eq("course_id", courseId).order("position"),
    supabase.from("lessons").select(LESSON_COLUMNS).eq("course_id", courseId).order("position"),
  ])
  return { course: course as CourseRow, modules: (modules ?? []) as ModuleRow[], lessons: (lessons ?? []) as LessonRow[] }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: string) => UUID_RE.test(v)

/** Start of "today" for chat limits: midnight in India (matches take_question_credit). */
function istDayStart() {
  const offset = 330 * 60 * 1000
  const ist = new Date(Date.now() + offset)
  ist.setUTCHours(0, 0, 0, 0)
  return new Date(ist.getTime() - offset).toISOString()
}

/** This lesson's professor chat and how many questions the learner has used today. */
export async function getProfessorChat(lessonId: string) {
  const supabase = await createClient()
  const [{ data: turns }, { data: today }] = await Promise.all([
    supabase
      .from("professor_questions")
      .select("id, kind, section, question, reply, verdict")
      .eq("lesson_id", lessonId)
      .eq("status", "answered")
      .order("created_at")
      .limit(60),
    supabase
      .from("professor_questions")
      .select("lesson_id, status, kind, paid")
      .eq("paid", false)
      .gte("created_at", istDayStart()),
  ])
  const all = today ?? []
  const rows = all.filter((r) => r.kind === "ask")
  const quick = all.filter((r) => r.kind !== "ask")
  // Same counting as the database: up to 2 failed answers a day are refunded.
  const count = (list: typeof rows) =>
    list.filter((r) => r.status !== "failed").length + Math.max(list.filter((r) => r.status === "failed").length - 2, 0)
  return {
    turns: (turns ?? []) as ChatTurn[],
    usedToday: count(rows),
    usedLesson: count(rows.filter((r) => r.lesson_id === lessonId)),
    usedQuick: count(quick),
  }
}

/** Everything the account page shows: learning profile, today's chat usage and course stats. */
export async function getAccountOverview() {
  const supabase = await createClient()
  const [{ data: learning }, { data: today }, coursesTotal, lessonsDone] = await Promise.all([
    supabase
      .from("learner_profiles")
      .select("level, background, hours_per_week, learning_style, timeline, language")
      .maybeSingle(),
    supabase.from("professor_questions").select("status, kind").eq("paid", false).gte("created_at", istDayStart()),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("lessons").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
  ])
  const rows = today ?? []
  const count = (list: typeof rows) =>
    list.filter((r) => r.status !== "failed").length + Math.max(list.filter((r) => r.status === "failed").length - 2, 0)
  return {
    learning: learning as {
      level: string
      background: string | null
      hours_per_week: number | null
      learning_style: string | null
      timeline: string | null
      language: string | null
    } | null,
    usage: {
      questionsToday: count(rows.filter((r) => r.kind === "ask")),
      quickToday: count(rows.filter((r) => r.kind !== "ask")),
      coursesTotal: coursesTotal.count ?? 0,
      lessonsCompleted: lessonsDone.count ?? 0,
    },
  }
}

/** Plan, limits, credit balance and free courses used this month (from my_account_summary()). */
export async function getAccountSummary(): Promise<AccountSummary> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("my_account_summary").maybeSingle<{
    plan: string
    ask_day: number
    ask_lesson: number
    quick_day: number
    courses_month: number
    credits: number
    courses_used: number
    period_end: string | null
  }>()
  if (error || !data) {
    if (error) console.error("my_account_summary failed:", error.message)
    return FREE_SUMMARY
  }
  return {
    plan: (data.plan === "pro" ? "pro" : "free") as PlanId,
    askDay: data.ask_day,
    askLesson: data.ask_lesson,
    quickDay: data.quick_day,
    coursesMonth: data.courses_month,
    credits: data.credits,
    coursesUsed: data.courses_used,
    periodEnd: data.period_end,
  }
}
