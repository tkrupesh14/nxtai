"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { removeSource } from "@/app/(learn)/onboarding/actions"
import { Button } from "@/components/site/ui/button"
import { Textarea } from "@/components/site/ui/textarea"
import { SOURCE_LIMITS } from "@/lib/sources/sections"
import { cn } from "@/lib/utils"

export type UploadedSource = { id: string; filename: string; kind: string; pages: number }

const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"

/** Optional step in onboarding: add files (or pasted text) for the course to be built from. */
export function SourceUpload({
  plan,
  sources,
  onChange,
}: {
  plan: "free" | "pro"
  sources: UploadedSource[]
  onChange: (sources: UploadedSource[]) => void
}) {
  const limits = SOURCE_LIMITS[plan]
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState("")
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const pagesUsed = sources.reduce((n, s) => n + s.pages, 0)
  const full = sources.length >= limits.files || pagesUsed >= limits.pages

  async function upload(body: FormData, label: string) {
    setError(null)
    setBusy(label)
    try {
      const res = await fetch("/api/sources", { method: "POST", body })
      const json = (await res.json().catch(() => ({}))) as Partial<UploadedSource> & { error?: string }
      if (!res.ok || !json.id) {
        setError(json.error ?? (res.status === 413 ? "That file is over 8 MB." : "We couldn't add this file. Please try again."))
        return false
      }
      onChange([...sources, json as UploadedSource])
      return true
    } catch {
      setError("We couldn't reach the server. Please try again.")
      return false
    } finally {
      setBusy(null)
    }
  }

  function addFile(file: File | undefined) {
    if (!file || busy) return
    if (file.size > 8 * 1024 * 1024) return setError("That file is over 8 MB. Try a smaller file or split it.")
    const body = new FormData()
    body.append("file", file)
    void upload(body, `Reading ${file.name}…`)
  }

  async function addText() {
    if (text.trim().length < 200) return setError("Paste at least a paragraph or two (200 characters).")
    const body = new FormData()
    body.append("text", text)
    if (await upload(body, "Reading your text…")) {
      setText("")
      setPasting(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    const { ok } = await removeSource(id)
    if (ok) onChange(sources.filter((s) => s.id !== id))
    else setError("We couldn't remove that file. Please try again.")
  }

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="text-sm font-medium">Teach from my own material (optional)</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Notes, a textbook chapter or a syllabus: your professor builds the course from it. PDF, Word or text,
          up to 8 MB each. {plan === "pro" ? "Pro" : "Free"}: {limits.files} file{limits.files === 1 ? "" : "s"}, up to {limits.pages} pages
          {limits.files === 1 ? "" : " in total"}
          {plan === "free" ? " (Pro: 3 files, 300 pages)" : ""}.
        </p>
      </div>

      {sources.length > 0 && (
        <ul className="grid min-w-0 gap-2" aria-label="Your material">
          {sources.map((s) => (
            <li key={s.id} className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate" title={s.filename}>
                <span aria-hidden>📄 </span>
                {s.filename}
                <span className="text-muted-foreground"> · {s.pages} page{s.pages === 1 ? "" : "s"}{s.kind === "pdf" ? "" : " (approx.)"}</span>
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(s.id)} aria-label={`Remove ${s.filename}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {busy ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          {busy}
        </p>
      ) : !full && pasting ? (
        <div className="grid gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={1_000_000}
            placeholder="Paste your notes or a chapter here"
            aria-label="Text to learn from"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addText}>
              Add this text
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPasting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : !full ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFile(e.dataTransfer.files[0])
          }}
          className={cn("flex flex-wrap items-center gap-2 rounded-md p-1", dragging && "bg-primary/5 ring-1 ring-primary")}
        >
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            aria-label="Upload a file"
            onChange={(e) => {
              addFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
            {sources.length ? "Add another file" : "Upload a file"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPasting(true)}>
            Paste text instead
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          That&apos;s the most your plan allows for one course.
          {plan === "free" ? (
            <>
              {" "}
              <Link href="/pricing" className="text-primary hover:underline">
                Pro
              </Link>{" "}
              allows 3 files and 300 pages.
            </>
          ) : null}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Only upload material you have the right to use. We keep the text to teach you, never the file itself, and it&apos;s
        only visible to you.{" "}
        <Link href="/terms#your-material" className="underline hover:text-foreground">
          Terms
        </Link>
      </p>
    </div>
  )
}
