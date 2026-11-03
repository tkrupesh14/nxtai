import "server-only"

import { pageLabel, type CourseSection } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"

export type SourceFile = { id: string; filename: string; kind: string; pages: number }

/** Uploads waiting to become a course (they're cleared after a day). */
export async function getPendingSources(): Promise<SourceFile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("course_sources")
    .select("id, filename, kind, pages")
    .is("course_id", null)
    .gt("created_at", new Date(Date.now() - 23 * 3600 * 1000).toISOString())
    .order("created_at")
  return (data ?? []) as SourceFile[]
}

/** The files a course was built from, in order. */
export async function getCourseSources(courseId: string): Promise<SourceFile[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("course_sources").select("id, filename, kind, pages").eq("course_id", courseId).order("position")
  return (data ?? []) as SourceFile[]
}

type SectionRow = {
  position: number | null
  idx: number
  heading: string | null
  page_from: number | null
  page_to: number | null
  body: string
  source_id: string
  course_sources: { filename: string } | null
}

const toSection = (r: SectionRow, position: number): CourseSection => ({
  position,
  heading: r.heading,
  page_from: r.page_from,
  page_to: r.page_to,
  body: r.body,
  filename: r.course_sources?.filename ?? "",
})

/** Pending uploads (in the learner's order) with their sections numbered as app_create_course will number them. */
export async function getMaterialForPlan(sourceIds: string[]) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("course_source_sections")
    .select("position, idx, heading, page_from, page_to, body, source_id, course_sources(filename)")
    .in("source_id", sourceIds)
    .is("course_id", null)
    .order("idx")
    .limit(2000)
  const rows = (data ?? []) as unknown as SectionRow[]
  let n = 0
  return sourceIds
    .map((id) => {
      const mine = rows.filter((r) => r.source_id === id).sort((a, b) => a.idx - b.idx)
      return { filename: mine[0]?.course_sources?.filename ?? "", sections: mine.map((r) => toSection(r, ++n)) }
    })
    .filter((f) => f.sections.length > 0)
}

/** A course's sections by S number. */
export async function getSections(courseId: string, positions: number[]): Promise<CourseSection[]> {
  if (positions.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("course_source_sections")
    .select("position, idx, heading, page_from, page_to, body, source_id, course_sources(filename)")
    .eq("course_id", courseId)
    .in("position", positions)
    .order("position")
  return ((data ?? []) as unknown as SectionRow[]).map((r) => toSection(r, r.position ?? 0))
}

/** "notes.pdf, pp. 12–15 · slides.pdf, p. 3" for the sections a lesson is taught from. */
export function sourcesLabel(sections: Pick<CourseSection, "filename" | "page_from" | "page_to" | "heading">[]) {
  const byFile = new Map<string, { from: number | null; to: number | null; headings: string[] }>()
  for (const s of sections) {
    const f = byFile.get(s.filename) ?? { from: null, to: null, headings: [] }
    if (s.page_from !== null) f.from = f.from === null ? s.page_from : Math.min(f.from, s.page_from)
    const to = s.page_to ?? s.page_from
    if (to !== null) f.to = f.to === null ? to : Math.max(f.to, to)
    if (s.heading && !f.headings.includes(s.heading)) f.headings.push(s.heading)
    byFile.set(s.filename, f)
  }
  return [...byFile.entries()]
    .map(([file, f]) => {
      const where = pageLabel(f.from, f.to) || (f.headings.length ? `“${f.headings.slice(0, 2).join("”, “")}”` : "")
      return where ? `${file}, ${where}` : file
    })
    .join(" · ")
}
