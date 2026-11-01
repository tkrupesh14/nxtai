import Link from "next/link"

import { ProfessorAvatar } from "@/components/learn/professor"
import { Badge } from "@/components/site/ui/badge"
import { getCategory, getSubcategory, professorForCategory } from "@/lib/learning/catalog"
import { lessonCount, type CatalogCourse } from "@/lib/learning/course-catalog"

/** A ready-made course in a grid; the whole card links to its page. */
export function CatalogCard({ course }: { course: CatalogCourse }) {
  const category = getCategory(course.category)
  const subject = getSubcategory(course.category, course.subcategory)
  const professor = professorForCategory(course.category)
  return (
    <li className="group relative flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
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
      <h3 className="font-semibold tracking-tight">
        <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
          {course.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{course.summary}</p>
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-muted-foreground">
        <ProfessorAvatar professor={professor} size="sm" />
        <span className="min-w-0 flex-1 truncate">with {professor.name}</span>
        <span className="shrink-0 tabular-nums">
          {lessonCount(course)} lessons · ~{course.estimated_weeks} wk
        </span>
      </div>
    </li>
  )
}
