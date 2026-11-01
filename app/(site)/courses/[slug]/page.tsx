import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ProfessorCard } from "@/components/learn/professor"
import { StartCourseButton } from "@/components/site/start-course-button"
import { Badge } from "@/components/site/ui/badge"
import { getCategory, getSubcategory, professorForCategory } from "@/lib/learning/catalog"
import { CATALOG, getCatalogCourse, lessonCount, totalMinutes } from "@/lib/learning/course-catalog"
import { PLANS } from "@/lib/learning/plans"

export function generateStaticParams() {
  return CATALOG.map((c) => ({ slug: c.slug }))
}
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const course = getCatalogCourse((await params).slug)
  if (!course) return {}
  return { title: `${course.title} — Krpex`, description: course.summary }
}

export default async function CatalogCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = getCatalogCourse((await params).slug)
  if (!course) notFound()
  const category = getCategory(course.category)
  const subject = getSubcategory(course.category, course.subcategory)
  const professor = professorForCategory(course.category)
  const hours = Math.round(totalMinutes(course) / 60)

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:py-16">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/courses" className="hover:text-foreground">
          Courses
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/courses#${course.category}`} className="hover:text-foreground">
          {category?.name}
        </Link>
      </nav>

      <header className="mt-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {category ? (
            <Badge variant="outline">
              <span aria-hidden>{category.icon}</span> {subject?.name ?? category.name}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="capitalize">
            {course.level}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{course.title}</h1>
        <p className="mt-3 text-lg text-muted-foreground text-pretty">{course.summary}</p>
        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="sr-only">Lessons</dt>
            <dd>
              <span className="font-semibold tabular-nums">{lessonCount(course)}</span> lessons in {course.modules.length} modules
            </dd>
          </div>
          <div>
            <dt className="sr-only">Study time</dt>
            <dd>
              about <span className="font-semibold tabular-nums">{hours}</span> hours
            </dd>
          </div>
          <div>
            <dt className="sr-only">Duration</dt>
            <dd>
              ~<span className="font-semibold tabular-nums">{course.estimated_weeks}</span> weeks at your own pace
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-start gap-4">
          <StartCourseButton slug={course.slug} />
          <p className="max-w-xs pt-1 text-xs text-muted-foreground text-pretty">
            Free plan: counts as one of your {PLANS.free.coursesMonth} new courses this month.{" "}
            <Link href="/pricing" className="underline hover:text-foreground">
              Plans
            </Link>
          </p>
        </div>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <div className="min-w-0">
          <section aria-labelledby="learn">
            <h2 id="learn" className="text-xl font-semibold tracking-tight">
              What you&apos;ll learn
            </h2>
            <ul className="mt-4 grid gap-2">
              {course.outcomes.map((o) => (
                <li key={o} className="flex gap-2 text-pretty">
                  <span className="text-primary" aria-hidden>
                    ✓
                  </span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="syllabus" className="mt-10">
            <h2 id="syllabus" className="text-xl font-semibold tracking-tight">
              Syllabus
            </h2>
            <ol className="mt-4 grid gap-3">
              {course.modules.map((m, mi) => (
                <li key={m.title} className="rounded-xl border bg-card">
                  <details open={mi === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-muted-foreground">Module {mi + 1}</span>
                        <span className="block font-semibold">{m.title}</span>
                        <span className="block text-sm text-muted-foreground">{m.summary}</span>
                      </span>
                      <span className="shrink-0 pt-4 text-xs text-muted-foreground tabular-nums">
                        {m.lessons.length} lessons <span aria-hidden className="inline-block transition-transform group-open:rotate-180">▾</span>
                      </span>
                    </summary>
                    <ol className="grid gap-2 border-t px-4 py-3">
                      {m.lessons.map((l) => (
                        <li key={l.title} className="flex gap-3 text-sm">
                          <span className="min-w-0 flex-1">
                            <span className="font-medium">{l.title}</span>
                            <span className="block text-muted-foreground">{l.objective}</span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{l.est_minutes} min</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <ProfessorCard professor={professor} note={<span className="text-muted-foreground">{professor.bio}</span>} />
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">Who it&apos;s for</p>
            <p className="mt-1 text-muted-foreground text-pretty">{course.audience}</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-semibold">How it works</p>
            <ul className="mt-2 grid list-disc gap-1 pl-5 text-muted-foreground">
              <li>Each lesson is written for you when you open it</li>
              <li>Practice questions and a quiz in every lesson</li>
              <li>Ask your professor about anything you&apos;re stuck on</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  )
}
