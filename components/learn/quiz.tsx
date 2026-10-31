"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { submitQuiz, type QuizResult } from "@/app/(learn)/learn/[courseId]/[lessonId]/actions"
import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

type Question = { question: string; options: string[] }

export function Quiz({
  courseId,
  lessonId,
  questions,
  passMark,
  alreadyCompleted,
}: {
  courseId: string
  lessonId: string
  questions: Question[]
  passMark: number
  alreadyCompleted: boolean
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const complete = answers.every((a) => a !== null)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await submitQuiz(courseId, lessonId, answers as number[])
      if ("error" in res) return setError(res.error)
      setResult(res)
      router.refresh()
    })
  }

  function retry() {
    setAnswers(questions.map(() => null))
    setResult(null)
  }

  return (
    <section aria-labelledby="quiz-heading" className="rounded-xl border bg-card p-6 md:p-8">
      <h2 id="quiz-heading" className="text-xl font-semibold tracking-tight">
        Check your understanding
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Score {passMark}% or more to complete this lesson{alreadyCompleted ? " (you already have)" : ""}.
      </p>

      <ol className="mt-6 grid gap-8">
        {questions.map((q, qi) => {
          const r = result?.results[qi]
          return (
            <li key={qi}>
              <fieldset disabled={Boolean(result) || pending}>
                <legend className="font-medium">
                  {qi + 1}. {q.question}
                </legend>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt, oi) => {
                    const chosen = answers[qi] === oi
                    const isAnswer = r && r.answerIndex === oi
                    const wrongPick = r && chosen && !r.correct
                    return (
                      <label
                        key={oi}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                          !result && "hover:bg-muted/60",
                          !result && chosen && "border-primary bg-primary/5 ring-1 ring-primary",
                          isAnswer && "border-green-600 bg-green-600/10",
                          wrongPick && "border-destructive bg-destructive/10",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q${qi}`}
                          checked={chosen}
                          onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                          className="mt-0.5 accent-[var(--primary)]"
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
                {r && (
                  <p className={cn("mt-3 text-sm", r.correct ? "text-green-700 dark:text-green-400" : "text-destructive-foreground")}>
                    <span className="font-medium">{r.correct ? "Correct. " : "Not quite. "}</span>
                    <span className="text-muted-foreground">{r.explanation}</span>
                  </p>
                )}
              </fieldset>
            </li>
          )
        })}
      </ol>

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive-foreground">
          {error}
        </p>
      )}

      {!result ? (
        <Button className="mt-8" onClick={submit} disabled={!complete || pending}>
          {pending ? "Checking…" : "Submit answers"}
        </Button>
      ) : (
        <div role="status" className="mt-8 flex flex-wrap items-center gap-4 rounded-lg border bg-muted/40 p-4">
          <p className="mr-auto font-medium">
            You scored {result.score}%. {result.passed ? "Lesson complete!" : `You need ${passMark}% to complete it.`}
          </p>
          {!result.passed && (
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          )}
          {result.passed &&
            (result.nextLessonId ? (
              <Button asChild>
                <Link href={`/learn/${courseId}/${result.nextLessonId}`}>Next lesson →</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`/learn/${courseId}`}>Course complete — view course</Link>
              </Button>
            ))}
        </div>
      )}
    </section>
  )
}
