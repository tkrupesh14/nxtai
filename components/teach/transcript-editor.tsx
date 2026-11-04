"use client"

import { useEffect, useState, useTransition } from "react"

import { addRecordingAsMaterial, saveTranscript } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"

/** The professor corrects the transcript (misheard terms, formulas), then adds it to their material. */
export function TranscriptEditor({ id, initial, editable }: { id: string; initial: string; editable: boolean }) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const dirty = text !== saved

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const save = () =>
    start(async () => {
      const r = await saveTranscript(id, text)
      setMessage({ ok: !!r.ok, text: r.message ?? "" })
      if (r.ok) setSaved(text)
    })
  const add = () =>
    start(async () => {
      if (dirty) {
        const r = await saveTranscript(id, text)
        if (!r.ok) return setMessage({ ok: false, text: r.message ?? "Couldn't save." })
        setSaved(text)
      }
      const r = await addRecordingAsMaterial(id)
      setMessage({ ok: !!r.ok, text: r.message ?? "" })
    })

  return (
    <div className="grid gap-3">
      <Label htmlFor="transcript">Transcript</Label>
      <Textarea
        id="transcript"
        value={text}
        readOnly={!editable}
        rows={24}
        maxLength={300000}
        onChange={(e) => {
          setText(e.target.value)
          setMessage(null)
        }}
        className="font-[inherit] leading-relaxed"
      />
      <p className="text-xs text-muted-foreground">
        Each paragraph starts with its time in the recording, like [12:30]; keep those so learners can be pointed to the right
        part. Write formulas the way you would on the board, or in LaTeX between double dollars: $$F = ma$$.
      </p>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
          {message.text}
        </p>
      ) : null}
      {editable ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={save} disabled={pending || !dirty}>
            Save changes
          </Button>
          <Button type="button" onClick={add} disabled={pending}>
            Add to my material
          </Button>
        </div>
      ) : null}
    </div>
  )
}
