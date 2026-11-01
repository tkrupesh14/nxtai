"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

type Section = { key: string; gated: boolean; node: React.ReactNode }

const LectureContext = createContext<{ markAnswered: (key: string) => void }>({ markAnswered: () => {} })

const storageKey = (lessonId: string) => `nxtai:lecture:${lessonId}`

/**
 * Reveals a lesson one section at a time, like a professor moving through a class.
 * "Pause and think" sections (gated) must be answered before continuing.
 */
export function LectureStepper({
  lessonId,
  sections,
  after,
  startComplete,
}: {
  lessonId: string
  sections: Section[]
  /** Shown once every section is revealed (takeaways + quiz). */
  after: React.ReactNode
  startComplete: boolean
}) {
  const [revealed, setRevealed] = useState(startComplete ? sections.length : 1)
  const [answered, setAnswered] = useState<Set<string>>(() => new Set())
  const lastRef = useRef<HTMLDivElement>(null)
  const didMount = useRef(false)

  // Remember how far the learner got (per-browser convenience only).
  useEffect(() => {
    if (startComplete) return
    try {
      const saved = Number(localStorage.getItem(storageKey(lessonId)))
      if (saved > 1) setRevealed(Math.min(saved, sections.length))
    } catch {}
  }, [lessonId, sections.length, startComplete])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(lessonId), String(revealed))
    } catch {}
    if (didMount.current) lastRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    didMount.current = true
  }, [lessonId, revealed])

  const markAnswered = useCallback((key: string) => {
    setAnswered((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [])

  const current = sections[revealed - 1]
  const blocked = current?.gated && !answered.has(current.key)
  const done = revealed >= sections.length
  const percent = Math.round((revealed / sections.length) * 100)

  return (
    <LectureContext.Provider value={{ markAnswered }}>
      <div className="sticky top-[57px] z-10 -mx-4 mb-6 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Section {Math.min(revealed, sections.length)} of {sections.length}
          </span>
          {!done && (
            <button type="button" className="hover:text-foreground hover:underline" onClick={() => setRevealed(sections.length)}>
              Show whole lesson
            </button>
          )}
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="grid gap-8">
        {sections.slice(0, revealed).map((s, i) => (
          <div
            key={s.key}
            ref={i === revealed - 1 ? lastRef : undefined}
            className={cn("min-w-0 scroll-mt-28", i === revealed - 1 && i > 0 && "lecture-enter")}
          >
            {s.node}
          </div>
        ))}
      </div>

      {!done ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <Button size="lg" onClick={() => setRevealed((r) => r + 1)} disabled={blocked}>
            Continue
          </Button>
          {blocked && <p className="text-xs text-muted-foreground">Answer the question above to continue.</p>}
        </div>
      ) : (
        <div className="mt-10">{after}</div>
      )}
    </LectureContext.Provider>
  )
}

/** In-lesson practice question. Not graded; the answer is shown after trying. Content is pre-rendered Markdown. */
export function Checkpoint({
  id,
  answerIndex,
  question,
  options,
  explanation,
}: {
  id: string
  answerIndex: number
  question: React.ReactNode
  options: React.ReactNode[]
  explanation: React.ReactNode
}) {
  const { markAnswered } = useContext(LectureContext)
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = checked && choice === answerIndex

  function check() {
    setChecked(true)
    markAnswered(id)
  }

  return (
    <fieldset className="mt-4 min-w-0" disabled={checked}>
      <legend className="sr-only">Practice question</legend>
      <div className="font-medium">{question}</div>
      <div className="mt-3 grid gap-2" role="radiogroup">
        {options.map((opt, i) => (
          <label
            key={i}
            className={cn(
              "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border bg-background px-4 py-3 text-sm transition-colors",
              !checked && "hover:bg-muted/60",
              !checked && choice === i && "border-primary ring-1 ring-primary",
              checked && i === answerIndex && "border-green-600 bg-green-600/10",
              checked && choice === i && i !== answerIndex && "border-destructive bg-destructive/10",
            )}
          >
            <input
              type="radio"
              name={`cp-${id}`}
              checked={choice === i}
              onChange={() => setChoice(i)}
              className="mt-1 accent-[var(--primary)]"
            />
            <div className="min-w-0 flex-1">{opt}</div>
          </label>
        ))}
      </div>
      {!checked ? (
        <Button type="button" size="sm" className="mt-3" onClick={check} disabled={choice === null}>
          Check my answer
        </Button>
      ) : (
        <div className={cn("mt-3 text-sm", correct ? "text-green-700 dark:text-green-400" : "text-destructive-foreground")}>
          <p className="font-medium">{correct ? "Exactly right." : "Not quite."}</p>
          <div className="text-muted-foreground">{explanation}</div>
        </div>
      )}
    </fieldset>
  )
}
