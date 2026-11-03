import "server-only"

import { spawn } from "node:child_process"
import { join } from "node:path"

import { buildSections, MAX_SECTIONS, pageEquivalent, textChars, type ExtractedPage, type Section, type SourceKind } from "@/lib/sources/sections"

export type Extracted =
  | { ok: true; pages: number; chars: number; sections: Section[] }
  | { ok: false; error: "too_many_pages" | "unreadable" | "no_text" | "too_long" | "busy"; totalPages?: number }

const TIMEOUT_MS = 30_000
const MEMORY_MB = 384

// One extraction at a time on the 1.8 GB server; others wait their turn (up to 3 waiting).
let running: Promise<unknown> = Promise.resolve()
let waiting = 0

function runExtractor(kind: SourceKind, file: Uint8Array, maxPages: number): Promise<{ pages?: ExtractedPage[]; totalPages?: number | null; error?: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${MEMORY_MB}`, join(process.cwd(), "scripts/extract-text.mjs"), kind, String(maxPages)],
      { cwd: process.cwd(), stdio: ["pipe", "pipe", "ignore"], env: { PATH: process.env.PATH ?? "", NODE_ENV: "production" } as NodeJS.ProcessEnv },
    )
    let out = ""
    const timer = setTimeout(() => child.kill("SIGKILL"), TIMEOUT_MS)
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (d: string) => {
      out += d
      if (out.length > 20_000_000) child.kill("SIGKILL")
    })
    child.on("error", () => resolve({ error: "unreadable" }))
    child.on("close", () => {
      clearTimeout(timer)
      try {
        resolve(JSON.parse(out))
      } catch {
        resolve({ error: "unreadable" })
      }
    })
    child.stdin.on("error", () => {})
    child.stdin.end(Buffer.from(file))
  })
}

/** Extract and split an uploaded file. maxPages is what the learner's plan still allows. */
export async function extractSource(kind: SourceKind, file: Uint8Array, maxPages: number): Promise<Extracted> {
  if (waiting >= 3) return { ok: false, error: "busy" }
  waiting++
  const turn = running.then(() => runExtractor(kind, file, maxPages))
  running = turn.catch(() => {})
  const result = await turn.finally(() => waiting--)

  if (result.error === "too_many_pages") return { ok: false, error: "too_many_pages", totalPages: result.totalPages ?? undefined }
  if (result.error || !Array.isArray(result.pages)) return { ok: false, error: "unreadable" }

  const pages = result.pages.filter((p) => typeof p?.text === "string")
  const chars = textChars(pages)
  // Scanned PDFs have pages but (almost) no selectable text.
  if (chars < 200 || (kind === "pdf" && chars < 40 * pages.length)) return { ok: false, error: "no_text" }

  const sections = buildSections(pages)
  if (sections.length === 0) return { ok: false, error: "no_text" }
  if (sections.length > MAX_SECTIONS) return { ok: false, error: "too_long" }
  const total = kind === "pdf" ? (result.totalPages ?? pages.length) : pageEquivalent(chars)
  if (total > maxPages) return { ok: false, error: "too_many_pages", totalPages: total }
  return { ok: true, pages: total, chars, sections }
}
