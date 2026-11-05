import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import type { BankQuestion, InboxItem } from "@/lib/teach/bank"
import { checkTranscription } from "@/lib/teach/sarvam"

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
  teaching_style: string | null
  listing_requested: boolean
  live_at: string | null
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
    .select(
      "id, subject, display_name, title, institution, bio, languages, credentials, status, agreement_version, agreement_at, teaching_style, listing_requested, live_at",
    )
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

export type Recording = {
  id: string
  title: string
  language: string
  topic: string | null
  filename: string
  seconds: number
  status: "uploading" | "transcribing" | "ready" | "failed" | "added"
  error: string | null
  material_id: string | null
  created_at: string
  updated_at: string
}
const RECORDING_COLUMNS = "id, title, language, topic, filename, seconds, status, error, material_id, created_at, updated_at"

/**
 * Bring this professor's transcriptions up to date: ask Sarvam about jobs still running (at most 3 per page view,
 * each at most every 10 seconds) and save finished transcripts. Uploads that never finished are marked failed.
 */
export async function refreshMyRecordings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professor_recordings")
    .select("id, status, job_id, updated_at")
    .in("status", ["uploading", "transcribing"])
    .order("updated_at")
    .limit(10)
  const rows = (data ?? []) as { id: string; status: string; job_id: string | null; updated_at: string }[]
  const now = Date.now()
  const update = (id: string, status: "ready" | "failed" | "transcribing", fields: { transcript?: string; seconds?: number | null; error?: string }) =>
    supabase.rpc("app_update_recording", {
      p_key: serverKey(),
      p_id: id,
      p_status: status,
      p_job_id: null,
      p_transcript: fields.transcript ?? null,
      p_seconds: fields.seconds ?? null,
      p_error: fields.error ?? null,
    })
  let checked = 0
  for (const r of rows) {
    const age = now - new Date(r.updated_at).getTime()
    if (r.status === "uploading" || !r.job_id) {
      if (age > 60 * 60 * 1000) await update(r.id, "failed", { error: "The upload didn't finish. Please try again." })
      continue
    }
    if (age < 10_000 || checked >= 3) continue
    checked++
    try {
      const result = await checkTranscription(r.job_id)
      if (result.state === "done") await update(r.id, "ready", { transcript: result.transcript, seconds: result.seconds })
      else if (result.state === "failed") await update(r.id, "failed", { error: result.error })
      else if (age > 3 * 60 * 60 * 1000) await update(r.id, "failed", { error: "Transcription took too long. Please try again." })
      else await update(r.id, "transcribing", {}) // records when we last checked
    } catch (e) {
      console.error("transcription check failed:", e instanceof Error ? e.message : e)
    }
  }
}

export async function getMyRecordings(): Promise<Recording[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("professor_recordings").select(RECORDING_COLUMNS).order("created_at", { ascending: false }).limit(100)
  return (data ?? []) as Recording[]
}

export async function getMyRecording(id: string): Promise<(Recording & { transcript: string | null }) | null> {
  const supabase = await createClient()
  const { data } = await supabase.from("professor_recordings").select(`${RECORDING_COLUMNS}, transcript`).eq("id", id).maybeSingle()
  return (data as (Recording & { transcript: string | null }) | null) ?? null
}

export async function getMyBankQuestions(): Promise<BankQuestion[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("professor_bank_questions")
    .select("id, topic, language, question, options, answer_index, explanation, status, updated_at")
    .order("created_at", { ascending: false })
    .limit(1000)
  return (data ?? []) as BankQuestion[]
}

/** Learners' questions sent to this professor (open ones first). Never says who sent them. */
export async function getMyInbox(): Promise<InboxItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("professor_inbox")
  if (error) {
    console.error("professor_inbox failed:", error.message)
    return []
  }
  return (data ?? []) as InboxItem[]
}
