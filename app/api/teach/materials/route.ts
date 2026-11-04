import { NextResponse, type NextRequest } from "next/server"

import { extractSource } from "@/lib/sources/extract"
import { cleanFilename, detectKind, MAX_UPLOAD_BYTES, type SourceKind } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import { isTeachLanguage } from "@/lib/teach/subjects"

export const runtime = "nodejs"

/** Pages per file (the database also caps each professor at 5,000 pages in total). */
const MAX_PAGES = 300

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

const SAVE_ERRORS: Record<string, string> = {
  not_professor: "This is only for Krpex professors.",
  suspended: "Your professor account is paused. Please contact Krpex.",
  too_many_files: "You've reached 300 files. Remove some to add more.",
  too_many_pages: "That would go over your 5,000-page allowance. Remove some material to add more.",
  rate_limited: "That's a lot of uploads in an hour. Please wait a little and try again.",
}

/** A professor uploads one file (or pasted text): extracted to text, split into sections and saved as a draft. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host || new URL(origin).host !== host) return fail(403, "Please upload from the Krpex site.")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(401, "Please log in again.")
  const { data: prof } = await supabase.from("professors").select("status").maybeSingle()
  if (!prof) return fail(403, SAVE_ERRORS.not_professor)
  if (prof.status === "suspended") return fail(403, SAVE_ERRORS.suspended)

  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return fail(413, "That file is over 8 MB. Try a smaller file or split it.")
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail(400, "We couldn't read that upload. Please try again.")
  }
  const language = form.get("language")
  if (!isTeachLanguage(language)) return fail(400, "Choose the language of this material.")
  const topic = String(form.get("topic") ?? "").replace(/\s+/g, " ").trim().slice(0, 120)
  const title = String(form.get("title") ?? "").replace(/\s+/g, " ").trim()

  const file = form.get("file")
  const pasted = form.get("text")
  let kind: SourceKind
  let bytes: Uint8Array
  let name: string
  if (file instanceof File) {
    if (file.size > MAX_UPLOAD_BYTES) return fail(413, "That file is over 8 MB. Try a smaller file or split it.")
    if (file.size === 0) return fail(400, "That file is empty.")
    bytes = new Uint8Array(await file.arrayBuffer())
    name = cleanFilename(file.name)
    const detected = detectKind(name, bytes)
    if (!detected) return fail(415, "Please upload a PDF, Word (.docx) or text (.txt, .md) file. For slides, save them as PDF first.")
    kind = detected
  } else if (typeof pasted === "string" && pasted.trim()) {
    if (pasted.length > 1_000_000) return fail(413, "That's too much text to paste. Upload it as a file instead.")
    if (pasted.trim().length < 200) return fail(400, "Paste at least a paragraph or two (200 characters).")
    bytes = new TextEncoder().encode(pasted)
    name = "Notes"
    kind = "text"
  } else {
    return fail(400, "Choose a file or paste some text.")
  }

  const result = await extractSource(kind, bytes, MAX_PAGES)
  if (!result.ok) {
    const messages: Record<string, string> = {
      too_many_pages: `This file has ${result.totalPages ?? "too many"} pages; the most for one file is ${MAX_PAGES}. Split it into parts (for example by chapter).`,
      no_text:
        kind === "pdf"
          ? "This PDF has no selectable text (it may be scanned). Try a PDF you can select text in, or paste the text."
          : "We couldn't find any text in this file.",
      too_long: "This file has too much text for one upload. Split it into parts (for example by chapter).",
      busy: "We're reading other files right now. Please try again in a minute.",
      unreadable: "We couldn't read this file. It may be damaged or password-protected.",
    }
    return fail(422, messages[result.error] ?? messages.unreadable)
  }

  const { data: id, error } = await supabase.rpc("app_add_professor_material", {
    p_key: serverKey(),
    p_title: cleanFilename(title || name),
    p_kind: kind,
    p_language: language,
    p_topic: topic,
    p_pages: result.pages,
    p_chars: result.chars,
    p_sections: result.sections,
  })
  if (error || !id) {
    const known = SAVE_ERRORS[error?.message ?? ""]
    if (!known) console.error("app_add_professor_material failed:", error?.message)
    return fail(known ? 409 : 500, known ?? "We couldn't save this file. Please try again.")
  }
  return NextResponse.json({ id })
}
