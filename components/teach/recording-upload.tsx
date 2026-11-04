"use client"

import { useRef, useState } from "react"
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

/** Upload a lecture recording. It streams to the transcription service; only the transcript is kept. */
export function RecordingUpload({ languages }: { languages: string[] }) {
  const router = useRouter()
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const form = useRef<HTMLFormElement>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (progress !== null) return
    const data = new FormData(e.currentTarget)
    const file = data.get("recording")
    if (!(file instanceof File) || file.size === 0) return setMessage({ ok: false, text: "Choose a recording first." })
    if (!mediaType(file.name)) return setMessage({ ok: false, text: "Upload an audio or video file (MP3, M4A, MP4, WAV, WebM, OGG, AAC, FLAC or AMR)." })
    if (file.size > MAX_RECORDING_BYTES) return setMessage({ ok: false, text: "That file is over 500 MB. For a video, try uploading just the audio." })
    setMessage(null)
    setProgress(0)
    const seconds = await mediaSeconds(file)
    if (seconds && seconds > MAX_RECORDING_SECONDS) {
      setProgress(null)
      return setMessage({ ok: false, text: "Recordings can be up to 2 hours long. Split longer ones." })
    }
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
      <div className="grid gap-2">
        <Label htmlFor="r-file">Recording</Label>
        <Input id="r-file" name="recording" type="file" accept={`${MEDIA_ACCEPT},audio/*,video/mp4,video/webm`} className="min-w-0" />
        <p className="text-xs text-muted-foreground">
          Audio or video, up to 2 hours and 500 MB. We keep only the transcript, not the recording. Make sure no one else, such as
          students, can be heard without their permission.
        </p>
      </div>
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
        <Button type="submit" disabled={progress !== null}>
          {progress !== null ? "Uploading…" : "Upload recording"}
        </Button>
      </div>
    </form>
  )
}
