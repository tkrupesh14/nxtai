"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  issueCertificateAction,
  prepareAssessmentAction,
  submitAssessmentAction,
  type AssessmentResult,
} from "@/app/(learn)/learn/[courseId]/assessment-actions"
import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

function formatRetry(iso: string) {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
  return sameDay ? `at ${time}` : `on ${d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} at ${time}`
}

/** Shown until the test has questions: asks the server to write them, then reloads the page. */
export function AssessmentStarter({ courseId, moduleId, label }: { courseId: string; moduleId: string | null; label: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    let cancelled = false
    let polls = 0
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
    const run = async () => {
      const res = await prepareAssessmentAction(courseId, moduleId).catch(() => ({ status: "error" as const, message: "We couldn't reach the server. Please try again." }))
      if (cancelled) return
      if (res.status === "ready") {
        router.refresh()
        later(() => window.location.reload(), 4000) // in case the refresh is dropped
      } else if (res.status === "pending" && polls++ < 40) {
        later(run, 4000)
      } else {
        setError(res.status === "error" ? res.message : "This is taking longer than usual. Please try again.")
      }
    }
    setError(null)
    run()
    const pending = timers.current
    return () => {
      cancelled = true
      pending.forEach(clearTimeout)
    }
  }, [courseId, moduleId, router, attempt])

  return (
    <div className="rounded-xl border bg-card p-8 text-center" role="status">
      {error ? (
        <>
          <p className="text-destructive-foreground">{error}</p>
          <Button className="mt-4" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </Button>
        </>
      ) : (
        <>
          <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <p className="mt-4 font-medium">Your AI professor is writing your {label}…</p>
          <p className="mt-1 text-sm text-muted-foreground">This takes about half a minute, only the first time.</p>
        </>
      )}
    </div>
  )
}

type Question = { i: number; question: React.ReactNode; options: { i: number; node: React.ReactNode }[] }

export function AssessmentQuiz({
  courseId,
  assessmentId,
  kind,
  questions,
  passMark,
  retryAt: initialRetryAt,
  passed: alreadyPassed,
  nextHref,
  certificate,
}: {
  courseId: string
  assessmentId: string
  kind: "module" | "final"
  questions: Question[]
  passMark: number
  retryAt: string | null
  passed: boolean
  /** Where "Continue" goes after passing a module test (the final exam, or the course page). */
  nextHref: string
  /** Final exam: shown right after a first pass, without waiting for the page to refresh. */
  certificate?: { isPro: boolean; defaultName: string }
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [retryAt, setRetryAt] = useState<string | null>(initialRetryAt)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const answered = Object.keys(answers).length
  const complete = answered === questions.length
  const waiting = Boolean(retryAt && new Date(retryAt) > new Date()) && !result
  const name = kind === "module" ? "module test" : "final exam"

  // Ask before leaving with answers that haven't been submitted.
  useEffect(() => {
    if (!answered || result) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [answered, result])

  function submit() {
    setError(null)
    startTransition(async () => {
      const ordered = [...questions].sort((a, b) => a.i - b.i).map((q) => answers[q.i])
      const res = await submitAssessmentAction(courseId, assessmentId, ordered)
      if ("error" in res) {
        if (res.retryAt) setRetryAt(res.retryAt)
        return setError(res.error)
      }
      setResult(res)
      window.scrollTo({ top: 0 })
      router.refresh()
    })
  }

  const byI = new Map(result?.results.map((r) => [r.i, r]))
  const right = result?.results.filter((r) => r.correct).length ?? 0

  return (
    <section aria-label={name} className="grid gap-6">
      {result && (
        <div role="status" className={cn("rounded-xl border p-5", result.passed ? "border-green-600/40 bg-green-600/10" : "bg-muted/40")}>
          <p className="text-lg font-semibold">
            You scored {result.score}% ({right} of {questions.length}).{" "}
            {result.passed ? (kind === "module" ? "Module test passed!" : "You passed the final exam!") : `You need ${passMark}% to pass.`}
          </p>
          {!result.passed && (
            <p className="mt-1 text-sm text-muted-foreground">
              The questions you got wrong are marked below. Review those lessons
              {result.retryAt ? `, then try again ${formatRetry(result.retryAt)}` : ", then try again"}. Answers are shown once you pass.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {result.passed && kind === "module" && (
              <Button asChild>
                <Link href={nextHref}>{result.finalUnlocked ? "Take the final exam →" : "Back to the course →"}</Link>
              </Button>
            )}
            {!result.passed && !result.retryAt && (
              <Button onClick={() => window.location.reload()}>Try again</Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/learn/${courseId}`}>Course page</Link>
            </Button>
          </div>
        </div>
      )}

      {/* The server-rendered summary above is out of date once a new result is in. */}
      {result && <style>{".assessment-summary{display:none}"}</style>}

      {result?.passed && kind === "final" && !alreadyPassed && certificate && (
        <CertificateClaim courseId={courseId} defaultName={certificate.defaultName} isPro={certificate.isPro} />
      )}

      {!result && (
        <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-medium">
              {answered} of {questions.length} answered
            </span>
            <span className="text-muted-foreground">Pass mark {passMark}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
        </div>
      )}

      {waiting && retryAt && (
        <p role="status" className="rounded-lg border bg-muted/40 p-4 text-sm">
          {alreadyPassed ? "" : "Not passed yet. "}You can take this {name} again {formatRetry(retryAt)}. Meanwhile, review the lessons it covers.
        </p>
      )}

      <ol className="grid gap-8">
        {questions.map((q, qi) => {
          const r = byI.get(q.i)
          return (
            <li key={q.i}>
              <fieldset disabled={Boolean(result) || pending || waiting} className="disabled:opacity-100">
                <legend className="sr-only">Question {qi + 1}</legend>
                <div className="flex gap-2 font-medium">
                  <span>{qi + 1}.</span>
                  <div className="min-w-0 flex-1">{q.question}</div>
                </div>
                <div className="mt-3 grid gap-2">
                  {q.options.map((opt) => {
                    const chosen = answers[q.i] === opt.i
                    const isAnswer = r?.answerIndex === opt.i
                    const wrongPick = r && chosen && !r.correct
                    return (
                      <label
                        key={opt.i}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                          !result && !waiting && "hover:bg-muted/60",
                          !result && chosen && "border-primary bg-primary/5 ring-1 ring-primary",
                          isAnswer && "border-green-600 bg-green-600/10",
                          wrongPick && "border-destructive bg-destructive/10",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q${q.i}`}
                          checked={chosen}
                          onChange={() => setAnswers((a) => ({ ...a, [q.i]: opt.i }))}
                          className="mt-0.5 accent-[var(--primary)]"
                        />
                        <div className="min-w-0 flex-1">{opt.node}</div>
                      </label>
                    )
                  })}
                </div>
                {r && (
                  <p className={cn("mt-3 text-sm", r.correct ? "text-green-700 dark:text-green-400" : "text-destructive-foreground")}>
                    <span className="font-medium">{r.correct ? "Correct." : "Not quite."}</span>
                    {r.explanation ? <span className="text-muted-foreground"> {r.explanation}</span> : null}
                  </p>
                )}
              </fieldset>
            </li>
          )
        })}
      </ol>

      {error && (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
          {retryAt ? ` Try again ${formatRetry(retryAt)}.` : ""}
        </p>
      )}

      {!result && !waiting && (
        <Button className="justify-self-start" onClick={submit} disabled={!complete || pending}>
          {pending ? "Checking…" : complete ? "Submit answers" : `Answer all ${questions.length} questions`}
        </Button>
      )}
    </section>
  )
}

/** After the final exam: claim the certificate (Pro) or see how to get one. */
export function CertificateClaim({ courseId, defaultName, isPro }: { courseId: string; defaultName: string; isPro: boolean }) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!isPro) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Get your certificate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Certificates are part of Pro. Upgrade any time and come back here: your exam result is saved, so you won&apos;t need to take it again.
        </p>
        <Button asChild className="mt-4">
          <Link href="/pricing">See Pro</Link>
        </Button>
      </div>
    )
  }

  function claim(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await issueCertificateAction(courseId, name)
      if ("error" in res) return setError(res.error)
      router.push(`/certificate/${res.code}`)
    })
  }

  return (
    <form onSubmit={claim} className="rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">Get your certificate</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Check your name as it should appear on the certificate. It can&apos;t be changed afterwards.
      </p>
      <label className="mt-4 block text-sm font-medium" htmlFor="cert-name">
        Name on certificate
      </label>
      <input
        id="cert-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        required
        autoComplete="name"
        className="mt-1.5 w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive-foreground">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-4 block" disabled={pending || name.trim().length < 2} loading={pending}>
        {pending ? "Issuing…" : "Get my certificate"}
      </Button>
    </form>
  )
}
