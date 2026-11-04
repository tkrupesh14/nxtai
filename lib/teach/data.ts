import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type Professor = {
  id: string
  subject: string
  display_name: string
  title: string | null
  institution: string | null
  bio: string | null
  languages: string[]
  credentials: string | null
  status: "pending" | "approved" | "suspended"
  agreement_version: string
  agreement_at: string
}

export type Material = {
  id: string
  title: string
  kind: string
  language: string
  topic: string | null
  pages: number
  status: "draft" | "published"
  created_at: string
}

/** The signed-in user's professor profile, or null if they aren't a professor. */
export const getMyProfessor = cache(async (): Promise<Professor | null> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professors")
    .select("id, subject, display_name, title, institution, bio, languages, credentials, status, agreement_version, agreement_at")
    .maybeSingle()
  return (data as Professor | null) ?? null
})

export async function getMyMaterials(): Promise<Material[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professor_materials")
    .select("id, title, kind, language, topic, pages, status, created_at")
    .order("created_at", { ascending: false })
  return (data ?? []) as Material[]
}

export type LessonSummary = {
  id: string
  title: string
  topic: string | null
  language: string
  status: "draft" | "published"
  updated_at: string
  blocks: number
}

export async function getMyLessons(): Promise<LessonSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professor_lessons")
    .select("id, title, topic, language, status, updated_at, blocks")
    .order("updated_at", { ascending: false })
  return ((data ?? []) as (Omit<LessonSummary, "blocks"> & { blocks: unknown[] })[]).map((l) => ({
    ...l,
    blocks: Array.isArray(l.blocks) ? l.blocks.length : 0,
  }))
}

export async function getMyLesson(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professor_lessons")
    .select("id, title, topic, language, objective, blocks, key_takeaways, status")
    .eq("id", id)
    .maybeSingle()
  return data as
    | { id: string; title: string; topic: string | null; language: string; objective: string | null; blocks: unknown; key_takeaways: unknown; status: "draft" | "published" }
    | null
}

export type ReviewQueueItem = {
  id: string
  title: string
  level: string
  language: string
  created_at: string
  reviewed_at: string | null
}

/** Open sample lessons this professor can review (RLS: approved, same subject, their languages), newest first. */
export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const supabase = await createClient()
  const [lessons, reviews] = await Promise.all([
    supabase.from("review_lessons").select("id, title, level, language, created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("lesson_reviews").select("review_lesson_id, updated_at"),
  ])
  const done = new Map(((reviews.data ?? []) as { review_lesson_id: string; updated_at: string }[]).map((r) => [r.review_lesson_id, r.updated_at]))
  return ((lessons.data ?? []) as Omit<ReviewQueueItem, "reviewed_at">[]).map((l) => ({ ...l, reviewed_at: done.get(l.id) ?? null }))
}

export type ReviewLesson = {
  id: string
  title: string
  level: string
  language: string
  objective: string | null
  blocks: unknown
  key_takeaways: unknown
  quiz: unknown
}
export type MyReview = {
  accuracy: number
  clarity: number
  level_fit: number
  overall: number
  comment: string | null
  block_notes: unknown
  updated_at: string
}

export async function getReviewLesson(id: string): Promise<{ lesson: ReviewLesson | null; review: MyReview | null }> {
  const supabase = await createClient()
  const [lesson, review] = await Promise.all([
    supabase.from("review_lessons").select("id, title, level, language, objective, blocks, key_takeaways, quiz").eq("id", id).maybeSingle(),
    supabase
      .from("lesson_reviews")
      .select("accuracy, clarity, level_fit, overall, comment, block_notes, updated_at")
      .eq("review_lesson_id", id)
      .maybeSingle(),
  ])
  return { lesson: (lesson.data as ReviewLesson | null) ?? null, review: (review.data as MyReview | null) ?? null }
}
