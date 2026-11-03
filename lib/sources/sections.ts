/**
 * Learner material ("sources"): split extracted text into sections the course plan can assign to lessons,
 * and build the prompt text for plans, lessons, tests and the professor. Pure functions, unit tested.
 */

export type SourceKind = "pdf" | "docx" | "text"
export type ExtractedPage = { page: number | null; text: string }
export type Section = { heading: string | null; page_from: number | null; page_to: number | null; body: string }
/** A section as stored for a course: position is its 1-based "S" number across all the course's files. */
export type CourseSection = Section & { position: number; filename: string }

/** Plan limits for uploads. Keep in sync with app_add_source in migration 015. */
export const SOURCE_LIMITS = {
  free: { files: 1, pages: 50 },
  pro: { files: 3, pages: 300 },
} as const
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
/** Word and text files have no pages; count every 3,000 characters as one. */
export const CHARS_PER_PAGE = 3000
export const MAX_SECTIONS = 400

const TARGET = 4000 // characters per section
const MIN_BEFORE_HEADING = 800 // a heading starts a new section once the current one has this much
const HARD_MAX = 6000

export const pageEquivalent = (chars: number) => Math.max(1, Math.ceil(chars / CHARS_PER_PAGE))

/** File type from the name and the first bytes; null if we don't accept it. */
export function detectKind(filename: string, head: Uint8Array): SourceKind | null {
  const ext = filename.toLowerCase().split(".").pop() ?? ""
  const starts = (s: string) => s.split("").every((c, i) => head[i] === c.charCodeAt(0))
  if (ext === "pdf") return starts("%PDF-") ? "pdf" : null
  if (ext === "docx") return starts("PK") ? "docx" : null
  if (ext === "txt" || ext === "md" || ext === "markdown") {
    // Plain text: no NUL bytes in the first few KB.
    return head.subarray(0, 4096).includes(0) ? null : "text"
  }
  return null
}

/** A safe display name: no path, no control characters, at most 120 characters. */
export function cleanFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? ""
  const clean = base.replace(/[\u0000-\u001f\u007f<>"]/g, "").replace(/\s+/g, " ").trim()
  return (clean || "Document").slice(0, 120)
}

const MD_HEADING = /^#{1,3}\s+(.{1,120})$/
const NUMBERED_HEADING = /^((\d{1,2}(\.\d{1,2}){0,3}\.?)|((chapter|unit|section|module|lesson|part)\s+[\divxlc]+[.:]?))\s+\S.{0,90}$/i

/** A line that looks like a heading: markdown "#", "2.1 Title", "Chapter 3 …", or a short ALL-CAPS line. */
export function headingOf(line: string): string | null {
  const md = MD_HEADING.exec(line)
  if (md) return md[1].trim()
  if (line.length > 100 || /[.,;:]$/.test(line)) return null
  if (NUMBERED_HEADING.test(line)) return line
  const letters = line.replace(/[^A-Za-z]/g, "")
  if (letters.length >= 4 && line.length <= 70 && letters === letters.toUpperCase() && /[A-Z]/.test(letters)) return line
  return null
}

function cleanLine(line: string) {
  return line.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim()
}

/** Very long lines (text files without line breaks) split at sentence ends near the hard maximum. */
function splitLong(line: string): string[] {
  if (line.length <= HARD_MAX) return [line]
  const parts: string[] = []
  let rest = line
  while (rest.length > HARD_MAX) {
    const window = rest.slice(0, TARGET)
    const cut = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "))
    const at = cut > TARGET / 2 ? cut + 1 : TARGET
    parts.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

/** Split extracted pages into sections of about 4,000 characters, starting new ones at headings. */
export function buildSections(pages: ExtractedPage[]): Section[] {
  const sections: Section[] = []
  // Held in an object so TypeScript follows the updates made inside flush/start.
  const st: { cur: Section | null; lastHeading: string | null } = { cur: null, lastHeading: null }

  const flush = () => {
    if (st.cur && st.cur.body.trim()) sections.push({ ...st.cur, body: st.cur.body.trim() })
    st.cur = null
  }
  const start = (heading: string | null, page: number | null): Section => {
    flush()
    st.cur = { heading, page_from: page, page_to: page, body: "" }
    return st.cur
  }

  for (const { page, text } of pages) {
    for (const raw of text.split(/\r?\n/)) {
      const line = cleanLine(raw)
      if (!line) {
        // A blank line ends a paragraph.
        const c = st.cur
        if (c && c.body && !c.body.endsWith("\n\n")) c.body += c.body.endsWith("\n") ? "\n" : "\n\n"
        continue
      }
      for (const piece of splitLong(line)) {
        const heading = headingOf(piece)
        let c = st.cur
        if (heading) {
          st.lastHeading = heading
          if (!c || c.body.length >= MIN_BEFORE_HEADING) c = start(heading, page)
          else if (!c.heading) c.heading = heading
        } else if (!c || c.body.length + piece.length > TARGET) {
          // Over the target: continue the same topic in a new section.
          c = start(c?.heading ?? st.lastHeading, page)
        }
        c.body += (c.body && !c.body.endsWith("\n") ? "\n" : "") + (heading && MD_HEADING.test(piece) ? heading : piece)
        if (page !== null) {
          c.page_from ??= page
          c.page_to = page
        }
      }
    }
  }
  flush()
  return sections
}

/** Total characters of real text (to spot scanned PDFs, which have pages but no text). */
export const textChars = (pages: ExtractedPage[]) => pages.reduce((n, p) => n + p.text.replace(/\s/g, "").length, 0)

/** "p. 12" / "pp. 12–15" / "" for a range of pages. */
export function pageLabel(from: number | null, to: number | null) {
  if (from === null) return ""
  return to !== null && to !== from ? `pp. ${from}–${to}` : `p. ${from}`
}

/** Keeps learner material from closing the tag it is wrapped in. */
const escapeTags = (s: string) => s.replace(/<\/?\s*(source_material|section)/gi, (m) => m.replace("<", "‹"))

/** The material overview the course plan is designed from: one line per section, about 70k characters at most. */
export function sourceOutline(files: { filename: string; sections: CourseSection[] }[], maxChars = 70000): string {
  const all = files.flatMap((f) => f.sections)
  const snippet = Math.max(60, Math.min(300, Math.floor(maxChars / Math.max(all.length, 1)) - 60))
  return files
    .map((f) => {
      const first = f.sections[0]?.position
      const last = f.sections.at(-1)?.position
      const lines = f.sections.map((s) => {
        const pages = pageLabel(s.page_from, s.page_to)
        const text = s.body.replace(/\s+/g, " ")
        return `S${s.position}${pages ? ` (${pages})` : ""}${s.heading ? ` ${escapeTags(s.heading)}:` : ""} ${escapeTags(text.slice(0, snippet))}${text.length > snippet ? "…" : ""}`
      })
      return `File "${escapeTags(f.filename)}" (S${first}–S${last}):\n${lines.join("\n")}`
    })
    .join("\n\n")
}

/** Full text of the given sections for a prompt, trimmed evenly to fit maxChars. */
export function sourceExcerpt(sections: CourseSection[], maxChars: number): string {
  if (sections.length === 0) return ""
  const total = sections.reduce((n, s) => n + s.body.length, 0)
  const each = total <= maxChars ? Infinity : Math.max(200, Math.floor(maxChars / sections.length))
  return sections
    .map((s) => {
      const pages = pageLabel(s.page_from, s.page_to)
      const body = s.body.length > each ? `${s.body.slice(0, each)}…` : s.body
      const label = [`S${s.position}`, escapeTags(s.filename), pages, s.heading ? escapeTags(s.heading) : ""].filter(Boolean).join(" · ")
      return `<section ref="${label.replace(/"/g, "'")}">\n${escapeTags(body)}\n</section>`
    })
    .join("\n")
}

/** Section numbers from the AI plan: whole numbers that exist, in order, no repeats, at most 8. */
export function cleanSectionRefs(refs: unknown, maxPosition: number): number[] {
  if (!Array.isArray(refs)) return []
  const seen = new Set<number>()
  for (const r of refs) {
    const n = typeof r === "number" ? r : Number(r)
    if (Number.isInteger(n) && n >= 1 && n <= maxPosition) seen.add(n)
  }
  return [...seen].sort((a, b) => a - b).slice(0, 8)
}

/** "Free: 1 file up to 50 pages" style text. */
export function limitsText(plan: "free" | "pro") {
  const l = SOURCE_LIMITS[plan]
  return `${l.files} file${l.files === 1 ? "" : "s"}, up to ${l.pages} pages${l.files === 1 ? "" : " in total"}`
}
