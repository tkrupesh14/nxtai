"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { MAX_RECORDING_BYTES, MAX_RECORDING_SECONDS, MEDIA_ACCEPT, mediaType } from "@/lib/teach/recordings"
import { TEACH_LANGUAGES } from "@/lib/teach/subjects"

/** The recording's length in seconds, read by the browser (null if it can't tell). */
function mediaSeconds(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio")
    const done = (v: number | null) => {
      URL.revokeObjectURL(url)
      resolve(v)
    }
    el.preload = "metadata"
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) && el.duration > 0 ? Math.ceil(el.duration) : null)
    el.onerror = () => done(null)
    setTimeout(() => done(null), 8000)
    el.src = url
  })
}

// Browser recording: the first format this browser can record (Chrome/Firefox: WebM, Safari: MP4), as an extension
// the upload route and transcription accept.
const RECORD_FORMATS = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  { mime: "audio/mp4", ext: "m4a" },
] as const

const clock = (s: number) => {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`
}

type Take = { file: File; seconds: number; url: string }

/** Records audio in the browser (pause, resume, stop), keeping the screen awake. Hands back a file to upload. */
function Recorder({ onTake, disabled }: { onTake: (take: Take | null) => void; disabled: boolean }) {
  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle")
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [take, setTake] = useState<Take | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const wake = useRef<{ release: () => Promise<void> } | null>(null)
  const timer = useRef<number | null>(null)
  const elapsed = useRef(0)

  const tick = () => {
    elapsed.current += 1
    setSeconds(elapsed.current)
    if (elapsed.current >= MAX_RECORDING_SECONDS) stop()
  }
  const startTimer = () => (timer.current = window.setInterval(tick, 1000))
  const stopTimer = () => timer.current && window.clearInterval(timer.current)
  const release = () => {
    stopTimer()
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    wake.current?.release().catch(() => {})
    wake.current = null
  }

  // Warn before leaving with a recording in progress or not yet uploaded; stop the microphone on unmount.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state === "recording" || state === "paused" || state === "done") e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [state])
  useEffect(() => () => release(), [])

  async function begin() {
    setError(null)
    const format = typeof MediaRecorder === "undefined" ? undefined : RECORD_FORMATS.find((f) => MediaRecorder.isTypeSupported(f.mime))
    if (!navigator.mediaDevices?.getUserMedia || !format) {
      return setError("This browser can't record audio. Try Chrome, or record on your phone and upload the file.")
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      return setError("Krpex can't use your microphone. Allow microphone access for this site in your browser settings and try again.")
    }
    try {
      wake.current = await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen") ?? null
    } catch {}
    chunks.current = []
    elapsed.current = 0
    setSeconds(0)
    const r = new MediaRecorder(stream.current, { mimeType: format.mime, audioBitsPerSecond: 48_000 })
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
    r.onstop = () => {
      release()
      const blob = new Blob(chunks.current, { type: format.mime.split(";")[0] })
      const t = { file: new File([blob], `lecture.${format.ext}`, { type: blob.type }), seconds: Math.max(elapsed.current, 1), url: URL.createObjectURL(blob) }
      setTake(t)
      setState("done")
      onTake(t)
    }
    r.start(10_000) // a chunk every 10 s, so a long recording isn't one huge buffer at the end
    rec.current = r
    startTimer()
    setState("recording")
  }

  function pause() {
    rec.current?.pause()
    stopTimer()
    setState("paused")
  }
  function resume() {
    rec.current?.resume()
    startTimer()
    setState("recording")
  }
  function stop() {
    if (rec.current && rec.current.state !== "inactive") rec.current.stop()
  }
  function discard() {
    if (take) URL.revokeObjectURL(take.url)
    setTake(null)
    setSeconds(0)
    setState("idle")
    onTake(null)
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      {state === "idle" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Records audio from this device&apos;s microphone, up to 2 hours. Keep this page open while you record; the screen stays on.
          </p>
          <Button type="button" variant="outline" className="justify-self-start" onClick={begin} disabled={disabled}>
            <span className="size-2.5 rounded-full bg-red-600" aria-hidden />
            Start recording
          </Button>
        </>
      ) : state === "done" && take ? (
        <>
          <p className="text-sm font-medium">Recorded {clock(take.seconds)}. Listen back, then upload it below.</p>
          <audio controls src={take.url} className="w-full" aria-label="Your recording" />
          <Button type="button" variant="ghost" className="justify-self-start" onClick={() => confirm("Delete this recording and start again?") && discard()} disabled={disabled}>
            Discard and record again
          </Button>
        </>
      ) : (
        <>
          <p role="status" className="flex items-center gap-2 text-sm font-medium" aria-live="off">
            <span className={state === "recording" ? "size-2.5 animate-pulse rounded-full bg-red-600" : "size-2.5 rounded-full bg-muted-foreground"} aria-hidden />
            {state === "recording" ? "Recording" : "Paused"} · <span className="tabular-nums">{clock(seconds)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {state === "recording" ? (
              <Button type="button" variant="outline" onClick={pause}>
                Pause
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={resume}>
                Resume
              </Button>
            )}
            <Button type="button" onClick={stop}>
              Stop
            </Button>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/** Upload a lecture recording, or record one here. It streams to the transcription service; only the transcript is kept. */
export function RecordingUpload({ languages }: { languages: string[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<"file" | "record">("file")
  const [take, setTake] = useState<Take | null>(null)
  const [recorderKey, setRecorderKey] = useState(0)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const form = useRef<HTMLFormElement>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (progress !== null) return
    const data = new FormData(e.currentTarget)
    let file: File
    let seconds: number | null
    if (mode === "record") {
      if (!take) return setMessage({ ok: false, text: "Record your lecture first." })
      file = take.file
      seconds = take.seconds
      if (file.size > MAX_RECORDING_BYTES) return setMessage({ ok: false, text: "That recording is over 500 MB." })
    } else {
      const picked = data.get("recording")
      if (!(picked instanceof File) || picked.size === 0) return setMessage({ ok: false, text: "Choose a recording first." })
      if (!mediaType(picked.name)) return setMessage({ ok: false, text: "Upload an audio or video file (MP3, M4A, MP4, WAV, WebM, OGG, AAC, FLAC or AMR)." })
      if (picked.size > MAX_RECORDING_BYTES) return setMessage({ ok: false, text: "That file is over 500 MB. For a video, try uploading just the audio." })
      file = picked
      setMessage(null)
      setProgress(0)
      seconds = await mediaSeconds(picked)
      if (seconds && seconds > MAX_RECORDING_SECONDS) {
        setProgress(null)
        return setMessage({ ok: false, text: "Recordings can be up to 2 hours long. Split longer ones." })
      }
    }
    setMessage(null)
    setProgress(0)
    const q = new URLSearchParams({
      title: String(data.get("title") ?? ""),
      topic: String(data.get("topic") ?? ""),
      language: String(data.get("language") ?? ""),
      filename: file.name,
      seconds: String(seconds ?? ""),
    })
    // XMLHttpRequest, not fetch: it reports upload progress.
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `/api/teach/recordings?${q}`)
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100))
    xhr.onload = () => {
      setProgress(null)
      let json: { id?: string; error?: string } = {}
      try {
        json = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && json.id) {
        form.current?.reset()
        if (take) URL.revokeObjectURL(take.url)
        setTake(null)
        setRecorderKey((k) => k + 1)
        setMessage({ ok: true, text: "Uploaded. Transcribing now: this takes a few minutes for an hour of lecture." })
        router.refresh()
      } else {
        setMessage({ ok: false, text: json.error ?? (xhr.status === 413 ? "That file is too large." : "The upload didn't finish. Please try again.") })
      }
    }
    xhr.onerror = () => {
      setProgress(null)
      setMessage({ ok: false, text: "The upload was interrupted. Check your connection and try again." })
    }
    xhr.send(file)
  }

  return (
    <form ref={form} onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="r-title">Lecture title</Label>
          <Input id="r-title" name="title" maxLength={200} placeholder="Class 11: Newton's laws, lecture 2" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="r-topic">Lecture topic</Label>
          <Input id="r-topic" name="topic" maxLength={120} placeholder="Mechanics" />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Language you speak in it</legend>
        <div className="flex flex-wrap gap-4">
          {TEACH_LANGUAGES.map((l, i) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="language" value={l.id} defaultChecked={languages.includes(l.id) ? l.id === languages[0] : i === 0} className="size-4" />
              {l.id === "hi" ? "Hindi (English words are kept in English)" : l.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Add the recording</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="r-mode" checked={mode === "file"} onChange={() => setMode("file")} className="size-4" disabled={progress !== null} />
            Upload a file
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="r-mode" checked={mode === "record"} onChange={() => setMode("record")} className="size-4" disabled={progress !== null} />
            Record here
          </label>
        </div>
        {mode === "file" ? (
          <>
            <Input id="r-file" name="recording" type="file" accept={`${MEDIA_ACCEPT},audio/*,video/mp4,video/webm`} className="min-w-0" aria-label="Recording" />
            <p className="text-xs text-muted-foreground">Audio or video, up to 2 hours and 500 MB.</p>
          </>
        ) : (
          <Recorder key={recorderKey} onTake={setTake} disabled={progress !== null} />
        )}
        <p className="text-xs text-muted-foreground">
          We keep only the transcript, not the recording. Make sure no one else, such as students, can be heard without their permission.
        </p>
      </fieldset>
      {progress !== null ? (
        <div className="grid gap-1" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Uploading… {progress}%. Keep this page open.</p>
        </div>
      ) : null}
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
          {message.text}
        </p>
      ) : null}
      <div>
        <Button type="submit" loading={progress !== null} disabled={mode === "record" && !take}>
          {progress !== null ? "Uploading…" : mode === "record" ? "Upload this recording" : "Upload recording"}
        </Button>
      </div>
    </form>
  )
}
