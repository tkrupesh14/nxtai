import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

export type PublicCertificate = {
  code: string
  full_name: string
  course_title: string
  course_level: string
  lesson_count: number
  total_minutes: number
  score: number
  issued_at: string
}

const CODE_RE = /^[0-9A-Fa-f]{12}$/

/** A certificate by its public code (anyone with the link may check it), or null. */
export const getPublicCertificate = cache(async (code: string): Promise<PublicCertificate | null> => {
  if (!CODE_RE.test(code)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_certificate", { p_code: code }).maybeSingle<PublicCertificate>()
  if (error) console.error("get_certificate failed:", error.message)
  return data ?? null
})

export function studyHours(minutes: number) {
  const h = Math.max(1, Math.round(minutes / 60))
  return `${h} hour${h === 1 ? "" : "s"}`
}

export const issuedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })
