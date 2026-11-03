import { NextResponse, type NextRequest } from "next/server"

import { getAccountSummary } from "@/lib/learning/data"
import { extractSource } from "@/lib/sources/extract"
import { cleanFilename, detectKind, MAX_UPLOAD_BYTES, SOURCE_LIMITS, type SourceKind } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"

export const runtime = "nodejs"

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

const SAVE_ERRORS: Record<string, string> = {
  too_many_files: "You've added as many files as your plan allows for one course. Remove one to add another.",
  too_many_pages: "That would go over your plan's page allowance for one course.",
  rate_limited: "That's a lot of uploads in an hour. Please wait a little and try again.",
}

/** Upload one file (or pasted text) for a new course: extracted to text, split into sections and saved. */
export async function POST(request: NextRequest) {
  // Same-site only (the session cookie alone isn't enough).
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host || new URL(origin).host !== host) return fail(403, "Please upload from the Krpex site.")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(401, "Please log in again.")

  const length = Number(request.headers.get("content-length") ?? 0)
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return fail(413, "That file is over 8 MB. Try a smaller file or split it.")

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail(400, "We couldn't read that upload. Please try again.")
  }
  const file = form.get("file")
  const pasted = form.get("text")

  let kind: SourceKind
  let bytes: Uint8Array
  let filename: string
  if (file instanceof File) {
    if (file.size > MAX_UPLOAD_BYTES) return fail(413, "That file is over 8 MB. Try a smaller file or split it.")
    if (file.size === 0) return fail(400, "That file is empty.")
    bytes = new Uint8Array(await file.arrayBuffer())
    filename = cleanFilename(file.name)
    const detected = detectKind(filename, bytes)
    if (!detected) return fail(415, "Please upload a PDF, Word (.docx) or text (.txt, .md) file.")
    kind = detected
  } else if (typeof pasted === "string" && pasted.trim()) {
    if (pasted.length > 1_000_000) return fail(413, "That's too much text to paste. Upload it as a file instead.")
    bytes = new TextEncoder().encode(pasted)
    const title = form.get("title")
    filename = cleanFilename(typeof title === "string" && title.trim() ? title : "Pasted text")
    kind = "text"
  } else {
    return fail(400, "Choose a file or paste some text.")
  }

  // What the plan still allows for this course, so big files are refused before they're read.
  const [{ plan }, { data: pending }] = await Promise.all([
    getAccountSummary(),
    supabase
      .from("course_sources")
      .select("pages")
      .is("course_id", null)
      .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ])
  const limits = SOURCE_LIMITS[plan]
  const used = (pending ?? []).reduce((n, r) => n + (r.pages as number), 0)
  if ((pending ?? []).length >= limits.files) {
    return fail(409, plan === "pro" ? SAVE_ERRORS.too_many_files : "Free courses can be built from 1 file. Remove it to add another, or go Pro for up to 3 files.")
  }
  const left = limits.pages - used

  const result = await extractSource(kind, bytes, left)
  if (!result.ok) {
    const messages: Record<string, string> = {
      too_many_pages: `This file has ${result.totalPages ?? "too many"} pages${kind === "pdf" ? "" : " (counting 3,000 characters as a page)"}; you can add up to ${left} more${
        plan === "pro" ? "" : " on Free (Pro allows 300)"
      }. Try a shorter file or just the chapters you need.`,
      no_text:
        kind === "pdf"
          ? "This PDF has no selectable text (it may be scanned or photographed pages). Try a PDF you can select text in, or paste the text."
          : "We couldn't find any text in this file.",
      too_long: "This file has too much text for one course. Try just the chapters you need.",
      busy: "We're reading other files right now. Please try again in a minute.",
      unreadable: "We couldn't read this file. It may be damaged or password-protected.",
    }
    return fail(422, messages[result.error] ?? messages.unreadable)
  }

  const { data: id, error } = await supabase.rpc("app_add_source", {
    p_key: serverKey(),
    p_filename: filename,
    p_kind: kind,
    p_pages: result.pages,
    p_chars: result.chars,
    p_sections: result.sections,
  })
  if (error || !id) {
    const known = SAVE_ERRORS[error?.message ?? ""]
    if (!known) console.error("app_add_source failed:", error?.message)
    return fail(known ? 409 : 500, known ?? "We couldn't save this file. Please try again.")
  }
  return NextResponse.json({ id, filename, kind, pages: result.pages })
}
