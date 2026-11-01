"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { generateLessonAction } from "@/app/(learn)/learn/[courseId]/[lessonId]/actions"
import { LessonBlockView } from "@/components/learn/lesson-blocks"
import { Button } from "@/components/site/ui/button"
import type { Professor } from "@/lib/learning/catalog"
import type { LessonBlock } from "@/lib/learning/schemas"

type StreamEvent =
  | { type: "blocks"; blocks: LessonBlock[] }
  | { type: "done" }
  | { type: "ready" }
  | { type: "pending" }
  | { type: "error"; message: string }

/**
 * Writes the lesson the first time it is opened and shows each section as soon as the AI finishes it.
 * When it's saved, "Start the class" switches to the step-by-step lecture (with practice questions).
 */
export function LessonGenerator({
  courseId,
  lessonId,
  professor,
}: {
  courseId: string
  lessonId: string
  professor: Professor
}) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<LessonBlock[]>([])
  const [phase, setPhase] = useState<"writing" | "ready" | "error">("writing")
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const started = useRef(false)

  // Another tab/request is already writing it: wait with the non-streaming action.
  const poll = useCallback(async () => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 5000))
      const res = await generateLessonAction(courseId, lessonId)
      if (res.status === "ready") return router.refresh()
      if (res.status === "error") {
        setError(res.message)
        return setPhase("error")
      }
    }
  }, [courseId, lessonId, router])

  const run = useCallback(async () => {
    setError(null)
    setPhase("writing")
    setBlocks([])
    try {
      const res = await fetch("/api/lessons/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl: number
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim()
          buffer = buffer.slice(nl + 1)
          if (!line) continue
          const ev = JSON.parse(line) as StreamEvent
          if (ev.type === "blocks") setBlocks(ev.blocks)
          else if (ev.type === "done") setPhase("ready")
          else if (ev.type === "ready") return router.refresh()
          else if (ev.type === "pending") return void poll()
          else if (ev.type === "error") {
            setError(ev.message)
            return setPhase("error")
          }
        }
      }
    } catch {
      // Stream broke (network). The lesson may still finish on the server, so fall back to waiting for it.
      void poll()
    }
  }, [courseId, lessonId, poll, router])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void run()
  }, [run])

  useEffect(() => {
    if (phase !== "writing") return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [phase])

  const start = () => {
    window.scrollTo({ top: 0 })
    router.refresh()
  }

  if (phase === "error") {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-medium text-destructive-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void run()}>
          Try again
        </Button>
      </div>
    )
  }

  const banner =
    phase === "ready" ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <p className="text-sm font-medium">Your class is ready, with practice questions and a quiz.</p>
        <Button onClick={start}>Start the class</Button>
      </div>
    ) : (
      <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <div className="size-6 shrink-0 animate-spin rounded-full border-[3px] border-muted border-t-primary" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-medium">{professor.name} is writing your class…</p>
          <p className="text-muted-foreground">
            {blocks.length === 0
              ? "Each lesson is written for you the first time you open it. The first part appears in a few seconds."
              : `${blocks.length} section${blocks.length === 1 ? "" : "s"} written · start reading while the rest arrives (${seconds}s)`}
          </p>
        </div>
      </div>
    )

  return (
    <div className="grid gap-8">
      {banner}
      {blocks.length === 0 ? (
        <div className="grid gap-3" aria-hidden>
          {[90, 100, 75, 95, 60].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="grid min-w-0 gap-8 [&>*]:min-w-0">
          {blocks.map((b, i) => (
            <div key={i} className="lecture-enter min-w-0">
              <LessonBlockView block={b} professor={professor} id={`w${i}`} />
            </div>
          ))}
        </div>
      )}
      {phase === "ready" && blocks.length > 2 ? banner : null}
    </div>
  )
}
