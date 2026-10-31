import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { LessonGenerator } from "@/components/learn/lesson-generator"
import { Quiz } from "@/components/learn/quiz"
import { getCourse, isUnlocked, isUuid } from "@/lib/learning/data"
import { PASS_MARK, type QuizQuestion } from "@/lib/learning/schemas"
import { createClient } from "@/lib/supabase/server"

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params
  if (!isUuid(courseId) || !isUuid(lessonId)) notFound()
  const data = await getCourse(courseId)
  if (!data) notFound()
  const index = data.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) notFound()
  if (!isUnlocked(data.lessons, index)) redirect(`/learn/${courseId}`)

  const lesson = data.lessons[index]
  const mod = data.modules.find((m) => m.id === lesson.module_id)
  const prev = data.lessons[index - 1]
  const next = data.lessons[index + 1]

  const supabase = await createClient()
  const { data: body } = await supabase
    .from("lessons")
    .select("content_md, key_takeaways, quiz")
    .eq("id", lessonId)
    .single()
  // Never send the answers to the browser; grading happens on the server.
  const questions = ((body?.quiz ?? []) as QuizQuestion[]).map(({ question, options }) => ({ question, options }))
  const takeaways = (body?.key_takeaways ?? []) as string[]

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/learn/${courseId}`} className="hover:text-foreground">
          {data.course.title}
        </Link>
        <span aria-hidden>/</span>
        <span>Module {mod ? mod.position + 1 : "?"}</span>
      </nav>
      <p className="mt-6 text-sm font-medium text-primary">
        Lesson {index + 1} of {data.lessons.length} · {lesson.est_minutes ?? 30} min
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
      <p className="mt-2 text-muted-foreground text-pretty">{lesson.objective}</p>

      <div className="mt-8">
        {body?.content_md ? (
          <>
            <article className="lesson-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body.content_md}</ReactMarkdown>
            </article>
            {takeaways.length > 0 && (
              <aside className="mt-10 rounded-xl border bg-muted/40 p-6">
                <h2 className="font-semibold">Key takeaways</h2>
                <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm">
                  {takeaways.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </aside>
            )}
            {questions.length > 0 && (
              <div className="mt-10">
                <Quiz
                  key={lessonId}
                  courseId={courseId}
                  lessonId={lessonId}
                  questions={questions}
                  passMark={PASS_MARK}
                  alreadyCompleted={Boolean(lesson.completed_at)}
                />
              </div>
            )}
          </>
        ) : (
          <LessonGenerator courseId={courseId} lessonId={lessonId} />
        )}
      </div>

      <div className="mt-10 flex justify-between gap-4 border-t pt-6 text-sm">
        {prev ? (
          <Link href={`/learn/${courseId}/${prev.id}`} className="text-muted-foreground hover:text-foreground">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && lesson.completed_at ? (
          <Link href={`/learn/${courseId}/${next.id}`} className="text-right text-muted-foreground hover:text-foreground">
            {next.title} →
          </Link>
        ) : null}
      </div>
    </main>
  )
}
