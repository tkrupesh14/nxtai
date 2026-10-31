import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { getCourse, isUnlocked, isUuid, progressOf } from "@/lib/learning/data"
import { cn } from "@/lib/utils"

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  if (!isUuid(courseId)) notFound()
  const data = await getCourse(courseId)
  if (!data) notFound()
  const { course, modules, lessons } = data
  const progress = progressOf(lessons)
  const nextIndex = lessons.findIndex((l) => !l.completed_at)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">
        ← My courses
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {course.level}
        </Badge>
        {course.estimated_weeks ? <span className="text-xs text-muted-foreground">~{course.estimated_weeks} weeks</span> : null}
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{course.title}</h1>
      <p className="mt-2 text-muted-foreground text-pretty">{course.summary}</p>

      <div className="mt-6 rounded-xl border bg-card p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium">
            {progress.done} of {progress.total} lessons complete
          </span>
          <span className="text-muted-foreground">{progress.percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
        </div>
        {nextIndex >= 0 && (
          <Button asChild className="mt-4">
            <Link href={`/learn/${course.id}/${lessons[nextIndex].id}`}>
              {progress.done === 0 ? "Start first lesson" : "Continue learning"}
            </Link>
          </Button>
        )}
      </div>

      <ol className="mt-10 grid gap-8">
        {modules.map((m) => {
          const moduleLessons = lessons.filter((l) => l.module_id === m.id)
          return (
            <li key={m.id}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Module {m.position + 1}</h2>
              <p className="mt-1 text-xl font-semibold tracking-tight">{m.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{m.summary}</p>
              <ul className="mt-4 divide-y rounded-xl border bg-card">
                {moduleLessons.map((l) => {
                  const index = lessons.findIndex((x) => x.id === l.id)
                  const unlocked = isUnlocked(lessons, index)
                  const done = Boolean(l.completed_at)
                  const row = (
                    <div className="flex items-start gap-4 px-5 py-4">
                      <span
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          done && "border-primary bg-primary text-primary-foreground",
                          !done && unlocked && "border-primary text-primary",
                        )}
                        aria-hidden
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", !unlocked && "text-muted-foreground")}>{l.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{l.objective}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {done && l.best_score !== null ? `${l.best_score}%` : unlocked ? `${l.est_minutes ?? 30} min` : "Locked"}
                      </span>
                    </div>
                  )
                  return (
                    <li key={l.id}>
                      {unlocked ? (
                        <Link href={`/learn/${course.id}/${l.id}`} className="block transition-colors hover:bg-muted/50">
                          {row}
                        </Link>
                      ) : (
                        <div aria-disabled="true">{row}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
