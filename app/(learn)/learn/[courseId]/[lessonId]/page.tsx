import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AskAboutSection, ProfessorChat } from "@/components/learn/ask-professor"
import { LectureStepper, ListenToSection } from "@/components/learn/lecture"
import { LessonBlockView, Md } from "@/components/learn/lesson-blocks"
import { LessonTools } from "@/components/learn/course-tools"
import { LessonGenerator } from "@/components/learn/lesson-generator"
import { ProfessorCard } from "@/components/learn/professor"
import { Quiz } from "@/components/learn/quiz"
import { DifficultyText } from "@/components/code/difficulty-badge"
import { codeLinks } from "@/lib/code/host"
import { practiceFor, PRACTICE_SUBCATEGORIES } from "@/lib/code/practice"
import { getCategory } from "@/lib/learning/catalog"
import { courseProfessor } from "@/lib/teach/teacher"
import { getAccountSummary, getCourse, getProfessorChat, isUnlocked, isUuid } from "@/lib/learning/data"
import { getSections, sourcesLabel } from "@/lib/sources/data"
import { PASS_MARK, type LessonBlock, type QuizQuestion } from "@/lib/learning/schemas"
import { chunkSpeech, sectionSpeech, speakMarkdown } from "@/lib/learning/narration"
import { sectionLabel, toSections } from "@/lib/learning/sections"
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
  const category = getCategory(data.course.category)
  const professor = await courseProfessor(data.course)

  const supabase = await createClient()
  const [{ data: body }, { data: quiz }, sources] = await Promise.all([
    supabase.from("lessons").select("content_md, blocks, key_takeaways").eq("id", lessonId).single(),
    // Questions and options only: answers stay in the database, which grades the quiz.
    supabase.rpc("lesson_quiz_questions", { p_lesson: lessonId }),
    getSections(courseId, lesson.source_sections ?? []),
  ])
  const questions = ((quiz ?? []) as Pick<QuizQuestion, "question" | "options">[]).map(({ question, options }) => ({
    question: <Md compact>{question}</Md>,
    options: options.map((o, i) => (
      <Md key={i} compact>
        {o}
      </Md>
    )),
  }))
  const takeaways = (body?.key_takeaways ?? []) as string[]
  const blocks = (body?.blocks ?? null) as LessonBlock[] | null
  const sections = blocks?.length ? toSections(blocks) : []
  const hasContent = sections.length > 0 || Boolean(body?.content_md)
  const [chat, account] = hasContent ? await Promise.all([getProfessorChat(lessonId), getAccountSummary()]) : [null, null]
  // Coding lessons end with matching problems on Krpex Code (v2 Phase 4).
  const practice =
    hasContent && data.course.category === "coding" && PRACTICE_SUBCATEGORIES.includes(data.course.subcategory ?? "")
      ? practiceFor([lesson.title, lesson.objective, ...takeaways].join("\n"), data.course.level)
      : null
  const code = practice?.problems.length ? await codeLinks() : null

  const endOfLesson = (
    <>
      {takeaways.length > 0 && (
        <aside className="rounded-xl border bg-muted/40 p-6">
          <h2 className="font-semibold">Key takeaways</h2>
          <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-sm">
            {takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </aside>
      )}
      {practice && code && practice.problems.length > 0 && (
        <aside className="mt-6 rounded-xl border bg-card p-6" aria-label="Practise on Krpex Code">
          <h2 className="font-semibold">Practise this on Krpex Code</h2>
          <p className="mt-1 text-sm text-muted-foreground">Short problems that use today&apos;s idea. They run in your browser and earn XP for your streak.</p>
          <ul className="mt-4 divide-y rounded-lg border">
            {practice.problems.map((p) => (
              <li key={p.slug}>
                <a href={code.code(`/p/${p.slug}`)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {p.number}. {p.title}
                  </span>
                  <DifficultyText difficulty={p.difficulty} className="text-xs" />
                </a>
              </li>
            ))}
          </ul>
          {practice.tag && (
            <a href={`${code.code("/problems")}?tag=${encodeURIComponent(practice.tag)}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              More {practice.tag.toLowerCase()} problems →
            </a>
          )}
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
            moduleTestHref={next?.module_id === lesson.module_id ? undefined : `/learn/${courseId}/test/${lesson.module_id}`}
          />
        </div>
      )}
    </>
  )

  const page = (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-28 md:pt-14" lang={data.course.language === "hi" ? "hi" : undefined}>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/learn/${courseId}`} className="hover:text-foreground">
          {data.course.title}
        </Link>
        <span aria-hidden>/</span>
        <span>Module {mod ? mod.position + 1 : "?"}</span>
      </nav>
      <p className="mt-6 text-sm font-medium text-primary">
        {category ? `${category.icon} ${category.name} · ` : ""}Lesson {index + 1} of {data.lessons.length} ·{" "}
        {lesson.est_minutes ?? 30} min
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
      <p className="mt-2 text-muted-foreground text-pretty">{lesson.objective}</p>
      {sources.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          <span aria-hidden>📄 </span>From your material: {sourcesLabel(sources)}
        </p>
      )}
      <ProfessorCard professor={professor} className="mt-6" />

      <div className="mt-8">
        {blocks?.length ? (
          <LectureStepper
            lessonId={lessonId}
            startComplete={Boolean(lesson.completed_at)}
            sections={sections.map((section, si) => ({
              key: `s${si}`,
              gated: section.gated,
              speech: sectionSpeech(section.blocks.map(({ block }) => block)),
              node: (
                <div className="grid min-w-0 gap-8 [&>*]:min-w-0">
                  {section.blocks.map(({ block, index: bi }) => (
                    // The checkpoint id must match the section key so answering it unlocks "Continue".
                    <LessonBlockView key={bi} block={block} professor={professor} id={`s${si}`} />
                  ))}
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    <ListenToSection section={si} />
                    <AskAboutSection section={si} />
                  </div>
                </div>
              ),
            }))}
            after={endOfLesson}
            afterSpeech={
              takeaways.length
                ? chunkSpeech(`Key takeaways. ${takeaways.map(speakMarkdown).join(" ")} That's the lesson. Try the quiz when you're ready.`)
                : []
            }
          />
        ) : body?.content_md ? (
          <>
            <Md>{body.content_md}</Md>
            <div className="mt-10">{endOfLesson}</div>
          </>
        ) : (
          <LessonGenerator courseId={courseId} lessonId={lessonId} professor={professor} />
        )}
      </div>

      {hasContent && account ? <LessonTools courseId={courseId} lessonId={lessonId} credits={account.credits} /> : null}

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

  if (!chat || !account) return page
  return (
    <ProfessorChat
      courseId={courseId}
      lessonId={lessonId}
      professor={professor}
      sectionLabels={sections.map(sectionLabel)}
      initialTurns={chat.turns}
      initialUsedToday={chat.usedToday}
      initialUsedLesson={chat.usedLesson}
      initialUsedQuick={chat.usedQuick}
      limits={{ askDay: account.askDay, askLesson: account.askLesson, quickDay: account.quickDay }}
      initialCredits={account.credits}
    >
      {page}
    </ProfessorChat>
  )
}
