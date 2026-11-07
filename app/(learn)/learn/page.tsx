import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { ProfessorAvatar } from "@/components/learn/professor"
import { ProgressSummary } from "@/components/learn/progress-summary"
import { getCategory } from "@/lib/learning/catalog"
import { CatalogCard } from "@/components/site/catalog-card"
import { CATALOG } from "@/lib/learning/course-catalog"
import { getMyXp, getQuestionTimes, listCourses } from "@/lib/learning/data"
import { learningStats } from "@/lib/learning/stats"
import { courseProfessor } from "@/lib/teach/teacher"

export const metadata = { title: "My courses — Krpex" }

async function CourseGrid({ courses }: { courses: Awaited<ReturnType<typeof listCourses>> }) {
  if (courses.length === 0) {
    return <p className="rounded-xl border p-6 text-sm text-muted-foreground">No active courses. Restore one below or start a new one.</p>
  }
  const professors = await Promise.all(courses.map((c) => courseProfessor(c)))
  return (
    <ul className="grid gap-4 md:grid-cols-2">
        {courses.map((c, i) => {
          const category = getCategory(c.category)
          const professor = professors[i]
          return (
          <li key={c.id} className="flex flex-col rounded-xl border bg-card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {category && (
                <Badge variant="outline">
                  {category.icon} {category.name}
                </Badge>
              )}
              <Badge variant="secondary" className="capitalize">
                {c.level}
              </Badge>
              {c.estimated_weeks ? <span className="text-xs text-muted-foreground">~{c.estimated_weeks} weeks</span> : null}
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              <Link href={`/learn/${c.id}`} className="hover:underline">
                {c.title}
              </Link>
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <ProfessorAvatar professor={professor} size="sm" />
              <span>with {professor.name}</span>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  {c.progress.done} of {c.progress.total} lessons
                </span>
                <span>{c.progress.percent}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={c.progress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.title} progress`}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress.percent}%` }} />
              </div>
            </div>
            <div className="mt-5 flex flex-1 items-end">
              {c.nextLesson ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/learn/${c.id}/${c.nextLesson.id}`}>Continue: {c.nextLesson.title}</Link>
                </Button>
              ) : (
                <span className="text-sm font-medium text-primary">Completed 🎉</span>
              )}
            </div>
          </li>
          )
        })}
    </ul>
  )
}

export default async function MyCoursesPage() {
  const [courses, questionTimes, xp] = await Promise.all([listCourses(), getQuestionTimes(), getMyXp()])
  if (courses.length === 0) redirect("/onboarding")
  const stats = learningStats(courses.flatMap((c) => c.lessons), questionTimes)
  const active = courses.filter((c) => c.status !== "archived")
  // Most recently studied unfinished course (or the newest one) for the "Continue" card.
  // Ready-made courses to try next: the learner's own subjects first, skipping ones already started.
  const started = new Set(courses.map((c) => c.title))
  const mine = new Set(courses.map((c) => c.category))
  const suggestions = CATALOG.filter((c) => !started.has(c.title))
    .sort((a, b) => Number(mine.has(b.category)) - Number(mine.has(a.category)))
    .slice(0, 3)
  const resume =
    [...active].filter((c) => c.nextLesson).sort((a, b) => (b.lastActive ?? b.created_at).localeCompare(a.lastActive ?? a.created_at))[0] ?? null
  const archived = courses.filter((c) => c.status === "archived")

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My courses</h1>
          <p className="mt-1 text-muted-foreground">Pick up where you left off.</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">New course</Link>
        </Button>
      </div>

      <ProgressSummary stats={stats} xp={xp} />

      {resume?.nextLesson && (
        <section className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Continue learning</p>
            <p className="mt-1 font-semibold">{resume.nextLesson.title}</p>
            <p className="text-sm text-muted-foreground">
              {resume.title} · {resume.progress.done} of {resume.progress.total} lessons done
            </p>
          </div>
          <Button asChild>
            <Link href={`/learn/${resume.id}/${resume.nextLesson.id}`}>Continue</Link>
          </Button>
        </section>
      )}

      <h2 className="mb-4 text-lg font-semibold tracking-tight">Your courses</h2>
      <CourseGrid courses={active} />
      {suggestions.length > 0 && (
        <section aria-labelledby="explore" className="mt-12">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="explore" className="text-lg font-semibold tracking-tight">
              Ready-made courses
            </h2>
            <Link href="/courses" className="text-sm font-medium text-primary hover:underline">
              See all courses
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {suggestions.map((c) => (
              <CatalogCard key={c.slug} course={c} />
            ))}
          </ul>
        </section>
      )}
      {archived.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            Archived ({archived.length})
          </summary>
          <div className="mt-4 opacity-80">
            <CourseGrid courses={archived} />
          </div>
        </details>
      )}
    </main>
  )
}
