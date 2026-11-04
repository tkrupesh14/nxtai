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
