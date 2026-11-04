import Link from "next/link"
import { notFound } from "next/navigation"

import { LessonEditor } from "@/components/teach/lesson-editor"
import { isUuid } from "@/lib/learning/data"
import { getMyLesson, getMyProfessor } from "@/lib/teach/data"
import { fromStored } from "@/lib/teach/lessons"

export const metadata = { title: "Edit model lesson — Krpex" }

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const [professor, lesson] = await Promise.all([getMyProfessor(), getMyLesson(id)])
  if (!professor || !lesson) notFound()
  const takeaways = Array.isArray(lesson.key_takeaways) ? lesson.key_takeaways.filter((t): t is string => typeof t === "string") : []
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10 md:py-14 [&>*]:min-w-0">
      <div>
        <Link href="/teach" className="text-sm text-muted-foreground hover:text-foreground">
          ← Teaching
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lesson.status === "published" ? "Published. Changes you save go live straight away." : "Draft. Publish it from your Teaching page."}
        </p>
      </div>
      {professor.status === "suspended" ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
          Your professor account is paused, so lessons can&apos;t be changed.
        </p>
      ) : (
        <LessonEditor
          id={lesson.id}
          initial={{
            title: lesson.title,
            topic: lesson.topic ?? "",
            language: lesson.language === "hi" ? "hi" : "en",
            objective: lesson.objective ?? "",
            blocks: fromStored(lesson.blocks),
            key_takeaways: takeaways,
          }}
          professorName={professor.display_name}
        />
      )}
    </main>
  )
}
