import Link from "next/link"
import { notFound } from "next/navigation"

import { LessonEditor } from "@/components/teach/lesson-editor"
import { getMyProfessor } from "@/lib/teach/data"
import { lessonTemplate } from "@/lib/teach/lessons"

export const metadata = { title: "New model lesson — Krpex" }

export default async function NewLessonPage() {
  const professor = await getMyProfessor()
  if (!professor || professor.status === "suspended") notFound()
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10 md:py-14 [&>*]:min-w-0">
      <div>
        <Link href="/teach" className="text-sm text-muted-foreground hover:text-foreground">
          ← Teaching
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">New model lesson</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Teach one class the way you would in person. We&apos;ve started you with the usual shape of a Krpex lesson; change,
          reorder or remove any block. The AI learns from published lessons how you explain things.
        </p>
      </div>
      <LessonEditor id={null} initial={lessonTemplate(professor.languages[0] === "hi" ? "hi" : "en")} professorName={professor.display_name} />
    </main>
  )
}
