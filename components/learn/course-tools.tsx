"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  deleteCourse,
  regenerateLesson,
  reportLesson,
  setCourseArchived,
  type ToolResult,
} from "@/app/(learn)/learn/course-actions"
import { Button } from "@/components/site/ui/button"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { cn } from "@/lib/utils"

function Result({ result }: { result: ToolResult | null }) {
  if (!result?.message) return null
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn("text-sm", result.ok ? "text-green-700 dark:text-green-400" : "text-destructive-foreground")}
    >
      {result.message}
    </p>
  )
}

/** Archive / restore / delete, at the bottom of the course page. */
export function CourseOptions({ courseId, archived }: { courseId: string; archived: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<ToolResult | null>(null)
  const [pending, start] = useTransition()

  return (
    <section className="mt-12 rounded-xl border p-5">
      <h2 className="font-semibold">Course options</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {archived
          ? "This course is archived. Restore it to see it in My courses again."
          : "Archive a course to hide it from My courses without losing your progress."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setCourseArchived(courseId, !archived)
              setResult(r)
              if (r.ok) router.refresh()
            })
          }
        >
          {archived ? "Restore course" : "Archive course"}
        </Button>
        {!confirming ? (
          <Button variant="ghost" className="text-destructive-foreground" onClick={() => setConfirming(true)} disabled={pending}>
            Delete course…
          </Button>
        ) : null}
      </div>
      {confirming && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-pretty">
            Delete this course, its lessons, quiz progress and professor chats for good? This can&apos;t be undone, and it
            doesn&apos;t give back this month&apos;s free course.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => start(async () => setResult(await deleteCourse(courseId)))}
            >
              {pending ? "Deleting…" : "Yes, delete it"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3">
        <Result result={result} />
      </div>
    </section>
  )
}

const REPORT_REASONS = [
  { id: "wrong", label: "Something is wrong" },
  { id: "confusing", label: "It's confusing" },
  { id: "broken", label: "Display is broken" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Something else" },
]

/** Regenerate (5 credits) and report a problem, at the bottom of a written lesson. */
export function LessonTools({ courseId, lessonId, credits }: { courseId: string; lessonId: string; credits: number }) {
  const router = useRouter()
  const [panel, setPanel] = useState<"none" | "regen" | "report">("none")
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [result, setResult] = useState<ToolResult | null>(null)
  const [pending, start] = useTransition()

  const toggle = (p: "regen" | "report") => {
    setResult(null)
    setPanel((cur) => (cur === p ? "none" : p))
  }

  return (
    <section className="mt-10 rounded-xl border p-4 text-sm">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground">
        <button type="button" className="hover:text-foreground hover:underline" onClick={() => toggle("report")}>
          ⚑ Report a problem
        </button>
        <button type="button" className="hover:text-foreground hover:underline" onClick={() => toggle("regen")}>
          ↻ Regenerate this lesson
        </button>
      </div>

      {panel === "regen" && (
        <div className="mt-4 grid gap-3">
          <p className="text-pretty">
            Your professor writes this lesson again from scratch, with new examples and a new quiz. It uses{" "}
            <strong>5 credits</strong> (you have {credits}). Your progress and unlocked lessons stay as they are.
          </p>
          {credits < 5 ? (
            <p>
              <Link href="/account#credits" className="font-medium text-primary hover:underline">
                Get credits
              </Link>
            </p>
          ) : (
            <div>
              <Button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await regenerateLesson(courseId, lessonId)
                    setResult(r)
                    if (r.ok) {
                      try {
                        localStorage.removeItem(`nxtai:lecture:${lessonId}`)
                      } catch {}
                      window.scrollTo({ top: 0 })
                      router.refresh()
                    }
                  })
                }
              >
                {pending ? "Starting…" : "Regenerate for 5 credits"}
              </Button>
            </div>
          )}
        </div>
      )}

      {panel === "report" && (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await reportLesson(lessonId, reason, details)
              setResult(r)
              if (r.ok) {
                setReason("")
                setDetails("")
                setPanel("none")
              }
            })
          }}
        >
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">What&apos;s the problem?</legend>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted",
                    reason === r.id && "border-primary bg-primary/10 font-medium",
                  )}
                >
                  <input type="radio" name="reason" value={r.id} className="sr-only" onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Which part, and what should it say?"
            />
          </div>
          <div>
            <Button type="submit" variant="outline" disabled={pending || !reason}>
              {pending ? "Sending…" : "Send report"}
            </Button>
          </div>
        </form>
      )}

      <div className={cn(result?.message && "mt-3")}>
        <Result result={result} />
      </div>
    </section>
  )
}
