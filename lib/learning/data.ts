import "server-only"

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
}

const LESSON_COLUMNS =
  "id, course_id, module_id, position, title, objective, est_minutes, best_score, attempts, completed_at, generated_at"

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
    .select("id, title, summary, level, estimated_weeks, goal, status, created_at, category, subcategory, professor, welcome")
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!courses?.length) return []

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, course_id, position, title, completed_at")
    .in("course_id", courses.map((c) => c.id))
    .order("position")
  if (lessonsError) throw lessonsError

  return (courses as CourseRow[]).map((course) => {
    const own = (lessons ?? []).filter((l) => l.course_id === course.id)
    const next = own.find((l) => !l.completed_at)
    return { ...course, progress: progressOf(own), nextLesson: next ? { id: next.id, title: next.title } : null }
  })
}

export async function getCourse(courseId: string) {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, summary, level, estimated_weeks, goal, status, created_at, category, subcategory, professor, welcome")
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
