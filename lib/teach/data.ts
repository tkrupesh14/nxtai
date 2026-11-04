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
