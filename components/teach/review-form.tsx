"use client"

import { useEffect, useState, useTransition } from "react"

import { submitReview } from "@/app/(learn)/teach/actions"
import { LessonBlockView, Md } from "@/components/learn/lesson-blocks"
import { Button } from "@/components/site/ui/button"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import type { Professor } from "@/lib/learning/catalog"
import type { LessonBlock, QuizQuestion } from "@/lib/learning/schemas"
import { RATING_CRITERIA, type BlockNote, type RatingKey, type Review } from "@/lib/teach/reviews"
import { cn } from "@/lib/utils"

const LETTERS = ["A", "B", "C", "D", "E", "F"]
type Note = { note: string; suggestion: string }

export function ReviewForm({
  lessonId,
  blocks,
  takeaways,
  quiz,
  professor,
  initial,
}: {
  lessonId: string
  blocks: LessonBlock[]
  takeaways: string[]
  quiz: QuizQuestion[]
  professor: Professor
  initial: Review | null
}) {
  const [ratings, setRatings] = useState<Record<RatingKey, number>>({
    accuracy: initial?.accuracy ?? 0,
    clarity: initial?.clarity ?? 0,
    level_fit: initial?.level_fit ?? 0,
    overall: initial?.overall ?? 0,
  })
  const [comment, setComment] = useState(initial?.comment ?? "")
  const [notes, setNotes] = useState<Record<number, Note>>(() =>
    Object.fromEntries((initial?.block_notes ?? []).map((n) => [n.block, { note: n.note, suggestion: n.suggestion }])),
  )
  const [open, setOpen] = useState<Set<number>>(() => new Set((initial?.block_notes ?? []).map((n) => n.block)))
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, startSave] = useTransition()

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const touch = () => {
    setDirty(true)
    setMessage(null)
  }
  const setNote = (i: number, patch: Partial<Note>) => {
    setNotes((n) => ({ ...n, [i]: { ...(n[i] ?? { note: "", suggestion: "" }), ...patch } }))
    touch()
  }
  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  function save() {
    const missing = RATING_CRITERIA.find((c) => !ratings[c.key])
    if (missing) {
      setMessage({ ok: false, text: `Give a rating for "${missing.label}".` })
      return
    }
    const block_notes: BlockNote[] = Object.entries(notes)
      .map(([block, n]) => ({ block: Number(block), note: n.note.trim(), suggestion: n.suggestion.trim() }))
      .filter((n) => n.note || n.suggestion)
      .sort((a, b) => a.block - b.block)
    startSave(async () => {
      const r = await submitReview(lessonId, { ...ratings, comment, block_notes })
      setMessage({ ok: !!r.ok, text: r.message ?? (r.ok ? "Saved." : "Something went wrong.") })
      if (r.ok) setDirty(false)
    })
  }

  return (
    <div className="grid min-w-0 gap-6">
      <ol className="grid min-w-0 gap-6" aria-label="The lesson">
        {blocks.map((b, i) => {
          const n = notes[i]
          const has = !!(n && (n.note.trim() || n.suggestion.trim()))
          return (
            <li key={i} className="grid min-w-0 gap-2">
              <p className="text-xs font-medium text-muted-foreground">Block {i + 1}</p>
              <LessonBlockView block={b} id={`review-${i}`} professor={professor} />
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="ghost" aria-expanded={open.has(i)} onClick={() => toggle(i)}>
                  {open.has(i) ? "Hide note" : has ? `Edit note on block ${i + 1}` : `Add a note on block ${i + 1}`}
                </Button>
              </div>
              {open.has(i) ? (
                <div className="grid gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`note-${i}`}>What&apos;s wrong or missing?</Label>
                    <Textarea
                      id={`note-${i}`}
                      aria-label={`Block ${i + 1} note`}
                      value={n?.note ?? ""}
                      maxLength={2000}
                      rows={3}
                      onChange={(e) => setNote(i, { note: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`suggestion-${i}`}>How you&apos;d put it (optional)</Label>
                    <Textarea
                      id={`suggestion-${i}`}
                      aria-label={`Block ${i + 1} suggestion`}
                      value={n?.suggestion ?? ""}
                      maxLength={20000}
                      rows={5}
                      placeholder="Rewrite the part you'd change. Markdown and $$maths$$ work."
                      onChange={(e) => setNote(i, { suggestion: e.target.value })}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>

      {takeaways.length ? (
        <aside className="rounded-xl border bg-muted/40 p-5">
          <h2 className="mb-2 font-semibold">Key takeaways</h2>
          <ul className="grid list-disc gap-1 pl-5">
            {takeaways.map((t, i) => (
              <li key={i}>
                <Md compact>{t}</Md>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      {quiz.length ? (
        <section className="rounded-xl border p-5" aria-label="End-of-lesson quiz">
          <h2 className="font-semibold">End-of-lesson quiz</h2>
          <p className="mt-1 text-sm text-muted-foreground">Learners answer these after the lesson. The correct answer is marked. Mention problems in your comment below.</p>
          <ol className="mt-4 grid gap-4">
            {quiz.map((q, i) => (
              <li key={i} className="grid gap-2 text-sm">
                <div className="font-medium">
                  <Md compact>{`${i + 1}. ${q.question}`}</Md>
                </div>
                <ul className="grid gap-1">
                  {q.options.map((o, j) => (
                    <li key={j} className={cn("rounded-md border px-3 py-1.5", j === q.answer_index && "border-green-600/50 bg-green-600/10")}>
                      <span className="mr-2 text-muted-foreground">{LETTERS[j]}.</span>
                      <Md compact>{o}</Md>
                      {j === q.answer_index ? <span className="ml-2 text-xs text-green-700 dark:text-green-400">(correct)</span> : null}
                    </li>
                  ))}
                </ul>
                {q.explanation ? (
                  <div className="text-muted-foreground">
                    <Md compact>{q.explanation}</Md>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="grid gap-5 rounded-xl border bg-card p-5 md:p-6" aria-label="Your review">
        <h2 className="text-lg font-semibold">Your review</h2>
        {RATING_CRITERIA.map((c) => (
          <fieldset key={c.key} className="grid gap-2">
            <legend className="text-sm font-medium">
              {c.label} <span className="font-normal text-muted-foreground">· {c.hint}</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <label
                  key={v}
                  className={cn(
                    "flex size-10 cursor-pointer items-center justify-center rounded-md border text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    ratings[c.key] === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name={c.key}
                    value={v}
                    checked={ratings[c.key] === v}
                    onChange={() => {
                      setRatings((r) => ({ ...r, [c.key]: v }))
                      touch()
                    }}
                    aria-label={`${c.label}: ${v} out of 5`}
                    className="sr-only"
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <p className="-mt-2 text-xs text-muted-foreground">1 = poor, 5 = excellent.</p>
        <div className="grid gap-1.5">
          <Label htmlFor="review-comment">Overall comment (optional)</Label>
          <Textarea
            id="review-comment"
            value={comment}
            maxLength={4000}
            rows={4}
            placeholder="What would make this lesson better? Is anything missing, wrong, or taught in the wrong order?"
            onChange={(e) => {
              setComment(e.target.value)
              touch()
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : initial ? "Update review" : "Submit review"}
          </Button>
          {message ? (
            <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
              {message.text}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
