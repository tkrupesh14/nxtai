import type { Metadata } from "next"
import Link from "next/link"

import { CatalogCard } from "@/components/site/catalog-card"
import { CATEGORIES } from "@/lib/learning/catalog"
import { CATALOG } from "@/lib/learning/course-catalog"

export const metadata: Metadata = {
  title: "Courses — Krpex",
  description:
    "Ready-made courses taught by AI professors: Python, web development, DSA for placements, SQL, data analysis, machine learning, personal finance, spoken English, aptitude and more.",
}

export default function CoursesPage() {
  const groups = CATEGORIES.map((c) => ({ category: c, courses: CATALOG.filter((x) => x.category === c.id) })).filter((g) => g.courses.length)
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">Ready-made courses</h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          Start a popular course in one tap. Your AI professor writes each lesson for you as you reach it, answers your
          questions and quizzes you along the way.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Want something else?{" "}
          <Link href="/onboarding" className="font-medium text-primary hover:underline">
            Build a course around your own goal
          </Link>
          .
        </p>
      </header>

      <nav aria-label="Subjects" className="mt-8 flex flex-wrap gap-2">
        {groups.map(({ category }) => (
          <a key={category.id} href={`#${category.id}`} className="rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
            <span aria-hidden>{category.icon}</span> {category.name}
          </a>
        ))}
      </nav>

      <div className="mt-10 grid gap-12">
        {groups.map(({ category, courses }) => (
          <section key={category.id} id={category.id} aria-labelledby={`h-${category.id}`} className="scroll-mt-24">
            <h2 id={`h-${category.id}`} className="mb-4 text-xl font-semibold tracking-tight">
              <span aria-hidden>{category.icon}</span> {category.name}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <CatalogCard key={c.slug} course={c} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
