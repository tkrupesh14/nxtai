import { NextResponse, type NextRequest } from "next/server"

import { cleanFilename } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import { MAX_RECORDING_BYTES, MAX_RECORDING_SECONDS, mediaType } from "@/lib/teach/recordings"
import { isTranscriptionConfigured, startTranscription } from "@/lib/teach/sarvam"
import { isTeachLanguage } from "@/lib/teach/subjects"

export const runtime = "nodejs"
// Long uploads: the body streams through to Sarvam as it arrives (never buffered or stored here).
export const maxDuration = 900

const fail = (status: number, error: string) => NextResponse.json({ error }, { status })

const START_ERRORS: Record<string, string> = {
  not_professor: "This is only for Krpex professors.",
  suspended: "Your professor account is paused. Please contact Krpex.",
  too_long: "Recordings can be up to 2 hours long. Split longer ones.",
  too_many_in_progress: "Three recordings are already being transcribed. Wait for one to finish.",
  monthly_limit: "That would go over this month's 600 minutes of recordings.",
}

/**
 * A professor uploads one lecture recording (the raw file as the body; title, language, topic and length in the
 * query). This route is left out of the proxy (proxy.ts), which would cut large bodies off at 10 MB.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!origin || !host || new URL(origin).host !== host) return fail(403, "Please upload from the Krpex site.")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(401, "Please log in again.")
  if (!isTranscriptionConfigured()) return fail(503, "Transcription isn't set up yet. Please try again later.")

  const q = request.nextUrl.searchParams
  const language = q.get("language")
  if (!isTeachLanguage(language)) return fail(400, "Choose the language of this recording.")
  const filename = cleanFilename(q.get("filename") ?? "")
  const contentType = mediaType(filename)
  if (!contentType) return fail(415, "Upload an audio or video file (MP3, M4A, MP4, WAV, WebM, OGG, AAC, FLAC or AMR).")
  const title = (q.get("title") ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || filename.replace(/\.[^.]+$/, "")
  const topic = (q.get("topic") ?? "").replace(/\s+/g, " ").trim().slice(0, 120)
  const seconds = Math.ceil(Number(q.get("seconds")) || 0)
  const bytes = Number(request.headers.get("content-length") ?? 0)
  if (!request.body || !Number.isFinite(bytes) || bytes <= 0) return fail(411, "We couldn't read that upload. Please try again.")
  if (bytes > MAX_RECORDING_BYTES) return fail(413, "That file is over 500 MB. For a video, try uploading just the audio.")
  // The browser reads the length from the file; if it couldn't, reserve the 2-hour maximum until the real length is known.
  const reserved = seconds >= 1 && seconds <= MAX_RECORDING_SECONDS ? seconds : seconds > MAX_RECORDING_SECONDS ? -1 : MAX_RECORDING_SECONDS
  if (reserved < 0) return fail(400, START_ERRORS.too_long)

  const key = serverKey()
  const { data: id, error } = await supabase.rpc("app_start_recording", {
    p_key: key,
    p_title: title,
    p_language: language,
    p_topic: topic,
    p_filename: filename,
    p_bytes: bytes,
    p_seconds: reserved,
  })
  if (error || typeof id !== "string") {
    const known = error ? START_ERRORS[error.message] : undefined
    if (!known) console.error("app_start_recording failed:", error?.message)
    return fail(known ? 400 : 500, known ?? "Couldn't start the upload. Please try again.")
  }

  const update = (status: "transcribing" | "failed", jobId: string | null, err: string | null) =>
    supabase.rpc("app_update_recording", {
      p_key: key,
      p_id: id,
      p_status: status,
      p_job_id: jobId,
      p_transcript: null,
      p_seconds: null,
      p_error: err,
    })
  try {
    const jobId = await startTranscription(request.body, {
      bytes,
      contentType,
      extension: filename.split(".").pop()!.toLowerCase(),
      language,
    })
    await update("transcribing", jobId, null)
    return NextResponse.json({ id })
  } catch (e) {
    console.error("recording upload failed:", e instanceof Error ? e.message : e)
    await update("failed", null, "The upload didn't finish. Please try again.")
    return fail(502, "The upload didn't finish. Please try again.")
  }
}
