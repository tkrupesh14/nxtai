"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { generateLessonAction } from "@/app/(learn)/learn/[courseId]/[lessonId]/actions"
import { Button } from "@/components/site/ui/button"

const MESSAGES = [
  "Preparing today's class…",
  "Adding examples that fit your goal…",
  "Preparing a short exercise…",
  "Writing quiz questions…",
  "Polishing the final draft…",
]

export function LessonGenerator({
  courseId,
  lessonId,
  professorName,
}: {
  courseId: string
  lessonId: string
  professorName: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState(0)
  const started = useRef(false)

  const run = useCallback(async () => {
    setError(null)
    for (;;) {
      const res = await generateLessonAction(courseId, lessonId)
      if (res.status === "ready") return router.refresh()
      if (res.status === "error") return setError(res.message)
      await new Promise((r) => setTimeout(r, 5000)) // another tab/request is generating it
    }
  }, [courseId, lessonId, router])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void run()
  }, [run])

  useEffect(() => {
    const t = setInterval(() => setMsg((v) => Math.min(v + 1, MESSAGES.length - 1)), 10000)
    return () => clearInterval(t)
  }, [])

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
        <p className="font-medium text-destructive-foreground">{error}</p>
        <Button className="mt-4" onClick={() => void run()}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8">
      <div className="flex items-center gap-4">
        <div className="size-8 shrink-0 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden />
        <div>
          <p className="font-medium">{professorName} is preparing your class</p>
          <p className="text-sm">{MESSAGES[msg]}</p>
          <p className="text-sm text-muted-foreground">Each lesson is written for you the first time you open it. This takes about 30 seconds.</p>
        </div>
      </div>
      <div className="mt-8 grid gap-3" aria-hidden>
        {[90, 100, 75, 95, 60].map((w, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
