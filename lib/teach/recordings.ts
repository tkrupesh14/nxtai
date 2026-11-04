/**
 * Lecture recordings (tracker 8.4): limits, file types, and turning Sarvam's timestamped transcript into text a
 * professor edits and then into material sections. Pure and client-safe.
 */

/** Extension → the content type Sarvam accepts for it. Video files are sent as-is; Sarvam transcribes the soundtrack. */
export const MEDIA_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  opus: "audio/opus",
  webm: "audio/webm",
  flac: "audio/flac",
  amr: "audio/amr",
}
export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).map((e) => `.${e}`).join(",")
export const MAX_RECORDING_BYTES = 500 * 1024 * 1024
export const MAX_RECORDING_SECONDS = 2 * 60 * 60
export const MONTHLY_RECORDING_MINUTES = 600

export const mediaType = (filename: string) => MEDIA_TYPES[filename.split(".").pop()?.toLowerCase() ?? ""] ?? null

/** Words Sarvam should listen for in Physics lectures (at most 50). */
export const PHYSICS_KEYTERMS = [
  "acceleration", "velocity", "momentum", "inertia", "friction", "torque", "angular momentum", "displacement",
  "kinematics", "projectile", "gravitation", "potential energy", "kinetic energy", "work-energy theorem",
  "Newton", "joule", "watt", "pascal", "coulomb", "ohm", "ampere", "volt", "tesla", "hertz",
  "electric field", "magnetic field", "capacitance", "resistance", "inductance", "electromagnetic induction",
  "Faraday", "Lenz", "Kirchhoff", "refraction", "diffraction", "interference", "wavelength", "frequency",
  "simple harmonic motion", "thermodynamics", "entropy", "Bernoulli", "viscosity", "photoelectric effect",
  "Planck", "de Broglie", "semiconductor", "vector", "scalar", "dimensional analysis",
] as const

export type TranscriptChunk = { text: string; start: number; end: number }

/** Sarvam's batch output ({ transcript, timestamps: { words, start_time_seconds, end_time_seconds } }) as chunks. */
export function chunksFromSarvam(output: unknown): { chunks: TranscriptChunk[]; transcript: string } {
  const o = (output ?? {}) as { transcript?: unknown; timestamps?: { words?: unknown; start_time_seconds?: unknown; end_time_seconds?: unknown } | null }
  const words = Array.isArray(o.timestamps?.words) ? o.timestamps.words : []
  const starts = Array.isArray(o.timestamps?.start_time_seconds) ? o.timestamps.start_time_seconds : []
  const ends = Array.isArray(o.timestamps?.end_time_seconds) ? o.timestamps.end_time_seconds : []
  const chunks = words
    .map((w, i) => ({ text: String(w ?? "").trim(), start: Number(starts[i]) || 0, end: Number(ends[i]) || Number(starts[i]) || 0 }))
    .filter((c) => c.text)
  return { chunks, transcript: typeof o.transcript === "string" ? o.transcript.trim() : chunks.map((c) => c.text).join(" ") }
}

export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

/** The text the professor edits: a paragraph about every minute, each starting with its time, e.g. "[12:30] …". */
export function transcriptText(chunks: TranscriptChunk[], fallback = ""): string {
  if (chunks.length === 0) return fallback
  const paragraphs: string[] = []
  let current: TranscriptChunk[] = []
  for (const c of chunks) {
    if (current.length && c.start - current[0].start >= 60) {
      paragraphs.push(`[${clock(current[0].start)}] ${current.map((x) => x.text).join(" ")}`)
      current = []
    }
    current.push(c)
  }
  if (current.length) paragraphs.push(`[${clock(current[0].start)}] ${current.map((x) => x.text).join(" ")}`)
  return paragraphs.join("\n\n")
}

const TIME_MARK = /^\[(\d+(?::\d{2}){1,2})\]\s*/

const toSeconds = (mark: string) => mark.split(":").reduce((acc, part) => acc * 60 + Number(part), 0)

/**
 * Material sections from the (edited) transcript: about 5 minutes each, headed by their time range, at most
 * 7,500 characters (the section limit is 8,000).
 */
export function transcriptSections(text: string, title: string): { heading: string; page_from: null; page_to: null; body: string }[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = TIME_MARK.exec(p)
      return { at: m ? toSeconds(m[1]) : null, body: p.replace(TIME_MARK, "").trim() }
    })
    .filter((p) => p.body)
  const sections: { heading: string; page_from: null; page_to: null; body: string }[] = []
  let group: typeof paragraphs = []
  const flush = () => {
    if (!group.length) return
    const from = group.find((p) => p.at !== null)?.at
    const heading = from !== undefined && from !== null ? `${title} (from ${clock(from)})` : title
    sections.push({ heading: heading.slice(0, 200), page_from: null, page_to: null, body: group.map((p) => p.body).join("\n\n") })
    group = []
  }
  for (const p of paragraphs) {
    const startAt = group.find((g) => g.at !== null)?.at
    const size = group.reduce((n, g) => n + g.body.length + 2, 0)
    if (group.length && ((startAt != null && p.at != null && p.at - startAt >= 300) || size + p.body.length > 7500)) flush()
    if (p.body.length > 7500) {
      for (let i = 0; i < p.body.length; i += 7500) {
        group.push({ at: i === 0 ? p.at : null, body: p.body.slice(i, i + 7500) })
        flush()
      }
      continue
    }
    group.push(p)
  }
  flush()
  return sections
}
