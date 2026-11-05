import Link from "next/link"
import { notFound } from "next/navigation"

import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { CourseOptions } from "@/components/learn/course-tools"
import { ProfessorCard } from "@/components/learn/professor"
import { getCategory, getSubcategory } from "@/lib/learning/catalog"
import { courseProfessor } from "@/lib/teach/teacher"
import { finalExamUnlocked, getAssessments, moduleTestUnlocked, type AssessmentRow } from "@/lib/learning/assessments"
import { getCourse, isUnlocked, isUuid, progressOf } from "@/lib/learning/data"
import { getCourseSources } from "@/lib/sources/data"
import { ASSESSMENT_PASS_MARK, ASSESSMENT_QUESTIONS } from "@/lib/learning/schemas"
import { cn } from "@/lib/utils"

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  if (!isUuid(courseId)) notFound()
  const data = await getCourse(courseId)
  if (!data) notFound()
  const { course, modules, lessons } = data
  const progress = progressOf(lessons)
  const nextIndex = lessons.findIndex((l) => !l.completed_at)
  const category = getCategory(course.category)
  const subcategory = getSubcategory(course.category, course.subcategory)
  const professor = await courseProfessor(course)
  const [{ byModule, final, certificateCode }, sources] = await Promise.all([getAssessments(course.id), getCourseSources(course.id)])
  const examOpen = finalExamUnlocked(modules, byModule)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:py-14" lang={course.language === "hi" ? "hi" : undefined}>
      <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">
        ← My courses
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {category && (
          <Badge variant="outline">
            {category.icon} {category.name}
            {subcategory ? ` › ${subcategory.name}` : ""}
          </Badge>
        )}
        <Badge variant="secondary" className="capitalize">
          {course.level}
        </Badge>
        {course.estimated_weeks ? <span className="text-xs text-muted-foreground">~{course.estimated_weeks} weeks</span> : null}
        {course.language === "hi" ? <Badge variant="outline">Taught in हिन्दी</Badge> : null}
        {course.status === "archived" ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{course.title}</h1>
      <p className="mt-2 text-muted-foreground text-pretty">{course.summary}</p>
      {sources.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span aria-hidden>📄 </span>
          Built from your material:{" "}
          {sources.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? ", " : ""}
              <span className="font-medium text-foreground">{s.filename}</span> ({s.pages} page{s.pages === 1 ? "" : "s"})
            </span>
          ))}
        </p>
      )}
      <ProfessorCard
        professor={professor}
        className="mt-6"
        note={course.welcome ? <p className="italic">&ldquo;{course.welcome}&rdquo;</p> : undefined}
      />

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
              <ul className="mt-4 divide-y overflow-hidden rounded-xl border bg-card">
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
                <li>
                  <TestRow
                    href={`/learn/${course.id}/test/${m.id}`}
                    title="Module test"
                    detail={`${ASSESSMENT_QUESTIONS.module} new questions on this module`}
                    unlocked={moduleTestUnlocked(lessons, m.id)}
                    lockedText="Pass every lesson above to unlock"
                    row={byModule.get(m.id)}
                  />
                </li>
              </ul>
            </li>
          )
        })}
      </ol>

      <section aria-labelledby="final-heading" className="mt-10 rounded-xl border bg-card p-6">
        <h2 id="final-heading" className="text-xl font-semibold tracking-tight">
          Final exam
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {ASSESSMENT_QUESTIONS.final} questions on the whole course · pass mark {ASSESSMENT_PASS_MARK}% · opens when every module test is
          passed. Pro learners who pass get a certificate.
        </p>
        {final?.passed_at ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge className="bg-green-600 text-white hover:bg-green-600">Passed · {final.best_score}%</Badge>
            <Button asChild variant={certificateCode ? "outline" : "default"}>
              <Link href={certificateCode ? `/certificate/${certificateCode}` : `/learn/${course.id}/exam`}>
                {certificateCode ? "View certificate" : "Get your certificate"}
              </Link>
            </Button>
          </div>
        ) : examOpen ? (
          <Button asChild className="mt-4">
            <Link href={`/learn/${course.id}/exam`}>{final?.attempts ? "Retake the final exam" : "Take the final exam"}</Link>
          </Button>
        ) : (
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            Locked · {modules.filter((m) => byModule.get(m.id)?.passed_at).length} of {modules.length} module tests passed
          </p>
        )}
      </section>

      <CourseOptions courseId={course.id} archived={course.status === "archived"} />
    </main>
  )
}

function TestRow({
  href,
  title,
  detail,
  unlocked,
  lockedText,
  row,
}: {
  href: string
  title: string
  detail: string
  unlocked: boolean
  lockedText: string
  row: AssessmentRow | undefined
}) {
  const passed = Boolean(row?.passed_at)
  const status = passed
    ? `Passed · ${row!.best_score}%`
    : !unlocked
      ? "Locked"
      : row?.attempts
        ? `Best ${row.best_score ?? 0}% · retake`
        : "Ready"
  const inner = (
    <div className="flex items-start gap-4 bg-muted/30 px-5 py-4">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
          passed && "border-green-600 bg-green-600 text-white",
          !passed && unlocked && "border-primary text-primary",
        )}
        aria-hidden
      >
        {passed ? "✓" : "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", !unlocked && "text-muted-foreground")}>{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{unlocked ? detail : lockedText}</p>
      </div>
      <span className={cn("shrink-0 text-xs", passed ? "font-medium text-green-700 dark:text-green-400" : "text-muted-foreground")}>{status}</span>
    </div>
  )
  return unlocked ? (
    <Link href={href} className="block rounded-b-xl transition-colors hover:bg-muted/50">
      {inner}
    </Link>
  ) : (
    <div aria-disabled="true" className="rounded-b-xl">
      {inner}
    </div>
  )
}
