import { getCategory } from "@/lib/learning/catalog"
import { CATALOG, getCatalogCourse, lessonCount, totalMinutes } from "@/lib/learning/course-catalog"
import { OG_SIZE, ogCard } from "@/lib/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "Krpex course"

export function generateStaticParams() {
  return CATALOG.map((c) => ({ slug: c.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const course = getCatalogCourse((await params).slug)
  if (!course) return ogCard({ kicker: "Krpex", title: "Course not found", subtitle: "" })
  const category = getCategory(course.category)
  const hours = Math.max(1, Math.round(totalMinutes(course) / 60))
  return ogCard({
    kicker: `${category?.name ?? "Course"} · ${lessonCount(course)} lessons · about ${hours} hours`,
    title: course.title,
    subtitle: course.summary.length > 140 ? `${course.summary.slice(0, 137)}…` : course.summary,
  })
}
