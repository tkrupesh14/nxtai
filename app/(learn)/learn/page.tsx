import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { ProfessorAvatar } from "@/components/learn/professor"
import { getCategory, getProfessor, professorForCategory } from "@/lib/learning/catalog"
import { listCourses } from "@/lib/learning/data"

export const metadata = { title: "My courses — Krpex" }

export default async function MyCoursesPage() {
  const courses = await listCourses()
  if (courses.length === 0) redirect("/onboarding")

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

      <ul className="grid gap-4 md:grid-cols-2">
        {courses.map((c) => {
          const category = getCategory(c.category)
          const professor = c.professor ? getProfessor(c.professor) : professorForCategory(c.category)
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
    </main>
  )
}
