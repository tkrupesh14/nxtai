import "server-only"

import { request } from "node:https"
import { request as httpRequest } from "node:http"
import { Readable } from "node:stream"

import { SarvamAIClient } from "sarvamai"

import { chunksFromSarvam, PHYSICS_KEYTERMS, transcriptText } from "@/lib/teach/recordings"

// Speech to text for lecture recordings (tracker 8.4): Sarvam's batch API, model saaras:v4 (one price for every
// model, ₹0.49/min pay-as-you-go; no diarisation, which costs more and a lecture has one speaker).
// SARVAM_BASE_URL is only for tests (tests/support/fake-sarvam.mjs).

let client: SarvamAIClient | null = null
function sarvam() {
  if (!process.env.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY is not set")
  client ??= new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY, ...(process.env.SARVAM_BASE_URL ? { baseUrl: process.env.SARVAM_BASE_URL } : {}) })
  return client
}

export const isTranscriptionConfigured = () => Boolean(process.env.SARVAM_API_KEY)

/** PUT a stream of known length to a signed upload URL without buffering it (S3 rejects chunked uploads). */
function putStream(url: string, body: ReadableStream<Uint8Array>, bytes: number, contentType: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const send = url.startsWith("https:") ? request : httpRequest
    const req = send(url, { method: "PUT", headers: { "content-length": bytes, "content-type": contentType } }, (res) => {
      res.resume()
      res.on("end", () => resolve(res.statusCode ?? 0))
    })
    req.on("error", reject)
    const source = Readable.fromWeb(body as import("node:stream/web").ReadableStream<Uint8Array>)
    source.on("error", (e) => req.destroy(e))
    source.pipe(req)
  })
}

/** Create a job, stream the recording into it and start it. Returns Sarvam's job id. */
export async function startTranscription(
  body: ReadableStream<Uint8Array>,
  opts: { bytes: number; contentType: string; extension: string; language: "en" | "hi" },
): Promise<string> {
  const api = sarvam()
  const job = await api.speechToTextJob.initialise({
    job_parameters: {
      model: "saaras:v4",
      // English words stay in English inside Hindi speech ("force बराबर mass गुणा acceleration").
      mode: opts.language === "hi" ? "codemix" : "transcribe",
      language_code: opts.language === "hi" ? "hi-IN" : "en-IN",
      with_timestamps: true,
      keyterms: [...PHYSICS_KEYTERMS],
    },
  })
  const name = `lecture.${opts.extension}`
  const links = await api.speechToTextJob.getUploadLinks({ job_id: job.job_id, files: [name] })
  const url = links.upload_urls[name]?.file_url
  if (!url) throw new Error("no upload link")
  const status = await putStream(url, body, opts.bytes, opts.contentType)
  if (status < 200 || status >= 300) throw new Error(`upload failed (${status})`)
  await api.speechToTextJob.start(job.job_id)
  return job.job_id
}

export type JobResult =
  | { state: "running" }
  | { state: "failed"; error: string }
  | { state: "done"; transcript: string; seconds: number | null }

/** Check a job; when it's done, fetch the transcript (as paragraphs with times, ready to edit). */
export async function checkTranscription(jobId: string): Promise<JobResult> {
  const api = sarvam()
  const status = await api.speechToTextJob.getStatus(jobId)
  if (status.job_state === "Failed") return { state: "failed", error: status.error_message || "Transcription failed." }
  if (status.job_state !== "Completed") return { state: "running" }
  const detail = status.job_details?.[0]
  if (!detail || detail.state !== "Success") return { state: "failed", error: detail?.error_message || "Transcription failed." }
  const outputs = (detail.outputs ?? []).map((o) => o.file_name)
  if (outputs.length === 0) return { state: "failed", error: "No transcript came back." }
  const links = await api.speechToTextJob.getDownloadLinks({ job_id: jobId, files: outputs })
  const url = links.download_urls[outputs[0]]?.file_url
  if (!url) return { state: "failed", error: "No transcript came back." }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  const { chunks, transcript } = chunksFromSarvam(await res.json())
  const text = transcriptText(chunks, transcript)
  if (!text.trim()) return { state: "failed", error: "No speech was found in this recording." }
  const last = chunks.at(-1)
  return { state: "done", transcript: text.slice(0, 300000), seconds: last ? Math.ceil(last.end) : null }
}
