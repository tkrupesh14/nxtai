"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { TEACH_LANGUAGES } from "@/lib/teach/subjects"

const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"

/** Upload notes, chapters, question papers (or paste text). Saved as a draft. */
export function MaterialUpload({ languages }: { languages: string[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pasting, setPasting] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const body = new FormData(e.currentTarget)
    const file = body.get("file")
    if (pasting) body.delete("file")
    else {
      body.delete("text")
      if (!(file instanceof File) || file.size === 0) return setMessage({ ok: false, text: "Choose a file first." })
      if (file.size > 8 * 1024 * 1024) return setMessage({ ok: false, text: "That file is over 8 MB. Try a smaller file or split it." })
    }
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/teach/materials", { method: "POST", body })
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
      if (!res.ok || !json.id) {
        setMessage({ ok: false, text: json.error ?? (res.status === 413 ? "That file is over 8 MB." : "We couldn't add this. Please try again.") })
        return
      }
      form.current?.reset()
      setMessage({ ok: true, text: "Added as a draft. Publish it when you're happy with it." })
      router.refresh()
    } catch {
      setMessage({ ok: false, text: "We couldn't reach the server. Please try again." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={form} onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="m-title">Material title</Label>
          <Input id="m-title" name="title" maxLength={200} placeholder="Chapter 3: Newton's laws (notes)" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="m-topic">Material topic</Label>
          <Input id="m-topic" name="topic" maxLength={120} placeholder="Mechanics" />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Language of this material</legend>
        <div className="flex flex-wrap gap-4">
          {TEACH_LANGUAGES.map((l, i) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="language" value={l.id} defaultChecked={languages.includes(l.id) ? l.id === languages[0] : i === 0} className="size-4" />
              {l.name}
            </label>
          ))}
        </div>
      </fieldset>
      {pasting ? (
        <div className="grid gap-2">
          <Label htmlFor="m-text">Text</Label>
          <Textarea id="m-text" name="text" rows={8} maxLength={1_000_000} placeholder="Paste your notes or explanation here" />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="m-file">File (PDF, Word or text, up to 8 MB and 300 pages)</Label>
          <input ref={fileInput} id="m-file" name="file" type="file" accept={ACCEPT} className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm" />
          <p className="text-xs text-muted-foreground">Slides: save them as PDF first. Scanned pages without selectable text can&apos;t be read yet.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Reading…" : pasting ? "Add this text" : "Upload"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setPasting((p) => !p)} disabled={busy}>
          {pasting ? "Upload a file instead" : "Paste text instead"}
        </Button>
      </div>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive-foreground"}>
          {message.text}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Only upload material you wrote or have the right to share. We keep the text, never the file.
      </p>
    </form>
  )
}
