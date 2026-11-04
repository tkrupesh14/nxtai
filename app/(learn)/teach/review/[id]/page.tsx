import Link from "next/link"
import { notFound } from "next/navigation"

import { ReviewForm } from "@/components/teach/review-form"
import { professorForCategory } from "@/lib/learning/catalog"
import { isUuid } from "@/lib/learning/data"
import { LessonBlockSchema, QuizQuestionSchema } from "@/lib/learning/schemas"
import { getMyProfessor, getReviewLesson } from "@/lib/teach/data"
import { BlockNoteSchema, type Review } from "@/lib/teach/reviews"
import { languageName } from "@/lib/teach/subjects"

export const metadata = { title: "Review a lesson — Krpex" }

const parseList = <T,>(value: unknown, parse: (v: unknown) => { success: true; data: T } | { success: false }): T[] =>
  Array.isArray(value) ? value.flatMap((v) => {
    const r = parse(v)
    return r.success ? [r.data] : []
  }) : []

export default async function ReviewLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const [professor, { lesson, review }] = await Promise.all([getMyProfessor(), getReviewLesson(id)])
  // RLS only shows open lessons to approved professors in that subject and language.
  if (!professor || !lesson) notFound()

  // Validate the stored blocks without dropping any, so block numbers in notes stay right.
  const blocks = Array.isArray(lesson.blocks) ? lesson.blocks.map((b) => LessonBlockSchema.safeParse(b)) : []
  if (blocks.some((b) => !b.success)) notFound()
  const takeaways = Array.isArray(lesson.key_takeaways) ? lesson.key_takeaways.filter((t): t is string => typeof t === "string") : []
  const quiz = parseList(lesson.quiz, (v) => QuizQuestionSchema.safeParse(v))
  const initial: Review | null = review
    ? {
        accuracy: review.accuracy,
        clarity: review.clarity,
        level_fit: review.level_fit,
        overall: review.overall,
        comment: review.comment ?? "",
        block_notes: parseList(review.block_notes, (v) => BlockNoteSchema.safeParse(v)),
      }
    : null

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10 md:py-14 [&>*]:min-w-0">
      <div>
        <Link href="/teach" className="text-sm text-muted-foreground hover:text-foreground">
          ← Teaching
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">
          Review · {languageName(lesson.language)} · {lesson.level}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
        {lesson.objective ? <p className="mt-1 text-muted-foreground">{lesson.objective}</p> : null}
        <p className="mt-3 rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          The AI wrote this sample lesson exactly as a learner would see it. Read it as their teacher would: add a note on any block
          that&apos;s wrong, unclear or could be taught better, then rate the lesson at the bottom. Only Krpex sees your review.
        </p>
      </div>
      <ReviewForm
        lessonId={lesson.id}
        blocks={blocks.map((b) => b.data!)}
        takeaways={takeaways}
        quiz={quiz}
        professor={professorForCategory("science")}
        initial={initial}
      />
    </main>
  )
}
