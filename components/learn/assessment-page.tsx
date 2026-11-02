import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { AssessmentQuiz, AssessmentStarter, CertificateClaim } from "@/components/learn/assessment"
import { Md } from "@/components/learn/lesson-blocks"
import { Button } from "@/components/site/ui/button"
import {
  finalExamUnlocked,
  getAssessmentQuestions,
  getAssessments,
  moduleTestUnlocked,
} from "@/lib/learning/assessments"
import { getCategory } from "@/lib/learning/catalog"
import { getAccountSummary, getCourse, isUuid } from "@/lib/learning/data"
import { ASSESSMENT_PASS_MARK, ASSESSMENT_QUESTIONS } from "@/lib/learning/schemas"
import { getCurrentProfile } from "@/lib/supabase/profile"

/** A module test (moduleId) or the course's final exam (null). */
export async function AssessmentPage({ courseId, moduleId }: { courseId: string; moduleId: string | null }) {
  if (!isUuid(courseId) || (moduleId !== null && !isUuid(moduleId))) notFound()
  const data = await getCourse(courseId)
  if (!data) notFound()
  const { course, modules, lessons } = data
  const mod = moduleId ? modules.find((m) => m.id === moduleId) : null
  if (moduleId && !mod) notFound()

  const { byModule, final, certificateCode } = await getAssessments(courseId)
  const unlocked = moduleId ? moduleTestUnlocked(lessons, moduleId) : finalExamUnlocked(modules, byModule)
  if (!unlocked) redirect(`/learn/${courseId}`)

  const row = moduleId ? (byModule.get(moduleId) ?? null) : final
  const kind = moduleId ? "module" : "final"
  const qs = row ? await getAssessmentQuestions(row.id) : null
  const covered = moduleId ? lessons.filter((l) => l.module_id === moduleId) : lessons
  const category = getCategory(course.category)

  // The module test after this one, or the final exam, for "Continue" after passing.
  // After passing this module test: the final exam if every other module test is passed too, else the course page.
  const othersPassed = modules.every((m) => m.id === moduleId || byModule.get(m.id)?.passed_at)
  const nextHref = othersPassed ? `/learn/${courseId}/exam` : `/learn/${courseId}`

  // Final exam: what the certificate panel needs (shown by the server once passed, or by the quiz right after passing).
  const [account, current] = moduleId ? [null, null] : await Promise.all([getAccountSummary(), getCurrentProfile()])
  const claim = account && current ? { isPro: account.plan === "pro", defaultName: current.profile.full_name } : undefined

  let certificate: React.ReactNode = null
  if (!moduleId && final?.passed_at) {
    certificate = certificateCode ? (
      <div className="rounded-xl border border-green-600/40 bg-green-600/10 p-6">
        <h2 className="text-lg font-semibold">Your certificate is ready</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share the link or save it as a PDF.</p>
        <Button asChild className="mt-4">
          <Link href={`/certificate/${certificateCode}`}>View certificate</Link>
        </Button>
      </div>
    ) : (
      claim && <CertificateClaim courseId={courseId} defaultName={claim.defaultName} isPro={claim.isPro} />
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-10 pb-28 md:pt-14">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href={`/learn/${courseId}`} className="hover:text-foreground">
          {course.title}
        </Link>
        <span aria-hidden>/</span>
        <span>{mod ? `Module ${mod.position + 1}` : "Final exam"}</span>
      </nav>
      <p className="mt-6 text-sm font-medium text-primary">
        {category ? `${category.icon} ${category.name} · ` : ""}
        {ASSESSMENT_QUESTIONS[kind]} questions · pass mark {ASSESSMENT_PASS_MARK}%
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
        {mod ? `Module test: ${mod.title}` : `Final exam: ${course.title}`}
      </h1>
      <p className="mt-2 text-muted-foreground text-pretty">
        {mod
          ? `New questions on the ${covered.length} lesson${covered.length === 1 ? "" : "s"} in this module. If you don't pass, you can try again an hour later.`
          : "Questions on the whole course, including some that combine lessons. You get 2 tries a day."}
      </p>
      {row && (row.attempts > 0 || row.passed_at) && (
        <p className="assessment-summary mt-2 text-sm text-muted-foreground">
          {row.passed_at ? "Passed" : "Not passed yet"} · best score {row.best_score ?? 0}% · {row.attempts} tr{row.attempts === 1 ? "y" : "ies"}
        </p>
      )}

      {certificate && <div className="mt-8">{certificate}</div>}

      <div className="mt-8">
        {qs ? (
          <AssessmentQuiz
            key={`${row!.id}-${qs.attempts}`}
            courseId={courseId}
            assessmentId={row!.id}
            kind={kind}
            passMark={ASSESSMENT_PASS_MARK}
            retryAt={qs.retryAt}
            passed={qs.passed}
            nextHref={nextHref}
            certificate={claim}
            questions={qs.questions.map((q) => ({
              i: q.i,
              question: <Md compact>{q.question}</Md>,
              options: q.options.map((o) => ({ i: o.i, node: <Md compact>{o.text}</Md> })),
            }))}
          />
        ) : (
          <AssessmentStarter courseId={courseId} moduleId={moduleId} label={mod ? "module test" : "final exam"} />
        )}
      </div>
    </main>
  )
}
