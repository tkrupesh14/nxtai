import Link from "next/link"

import { AccountSection } from "@/components/learn/account-section"
import { AgreementText } from "@/components/teach/agreement-text"
import { LessonList } from "@/components/teach/lesson-list"
import { MaterialList } from "@/components/teach/material-list"
import { Button } from "@/components/site/ui/button"
import { MaterialUpload } from "@/components/teach/material-upload"
import { RecordingList } from "@/components/teach/recording-list"
import { RecordingUpload } from "@/components/teach/recording-upload"
import { ProfileForm } from "@/components/teach/profile-form"
import { getMyLessons, getMyMaterials, getMyProfessor, getMyRecordings, getReviewQueue, refreshMyRecordings } from "@/lib/teach/data"
import { languageName, subjectName } from "@/lib/teach/subjects"

export const metadata = { title: "Teaching — Krpex" }

const STATUS_NOTE = {
  pending: "Krpex is checking your profile. You can fill it in and upload material now; you can publish once you're approved.",
  approved: "You're approved. Published material can be used to teach learners once professor-backed courses launch.",
  suspended: "Your professor account is paused. Your material isn't being used. Contact Krpex if you think this is a mistake.",
} as const

export default async function TeachPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const professor = await getMyProfessor()
  if (!professor) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Teach with Krpex</h1>
        <p className="mt-3 text-muted-foreground text-pretty">
          This space is for professors invited by Krpex. If you&apos;d like to help, write to us through the{" "}
          <Link href="/contact" className="text-primary hover:underline">
            contact page
          </Link>
          .
        </p>
      </main>
    )
  }
  // Finished transcriptions are collected first, so the lists below are up to date.
  await refreshMyRecordings()
  const [{ welcome }, materials, lessons, queue, recordings] = await Promise.all([
    searchParams,
    getMyMaterials(),
    getMyLessons(),
    professor.status === "approved" ? getReviewQueue() : Promise.resolve([]),
    getMyRecordings(),
  ])
  const published = materials.filter((m) => m.status === "published").length

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10 md:py-14 [&>*]:min-w-0">
      <div>
        <p className="text-sm text-muted-foreground">{subjectName(professor.subject)} professor</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
          {welcome ? `Welcome, ${professor.display_name}` : professor.display_name}
        </h1>
        <p
          role="status"
          className={
            professor.status === "suspended"
              ? "mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm"
              : "mt-3 rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground"
          }
        >
          {STATUS_NOTE[professor.status]}
        </p>
      </div>

      <AccountSection title="Your profile" description="Learners will see your name, title, institution and bio next to your AI professor.">
        <ProfileForm professor={professor} />
      </AccountSection>

      {professor.status !== "suspended" ? (
        <AccountSection
          title="Add material"
          description="Notes, chapters you wrote, worked problems, question papers with solutions. The AI teaches from what you publish."
        >
          <MaterialUpload languages={professor.languages} />
        </AccountSection>
      ) : null}

      <AccountSection
        title={`Lecture recordings (${recordings.length})`}
        description="Upload a recorded lecture or explanation. We turn your speech into text; you check it, then add it to your material."
      >
        {professor.status !== "suspended" ? (
          <div className="mb-5">
            <RecordingUpload languages={professor.languages} />
          </div>
        ) : null}
        <RecordingList recordings={recordings} />
      </AccountSection>

      <AccountSection title={`Your material (${materials.length}${published ? `, ${published} published` : ""})`}>
        <MaterialList materials={materials} canPublish={professor.status === "approved"} />
      </AccountSection>

      <AccountSection
        title={`Model lessons (${lessons.length})`}
        description="Write a lesson the way you'd teach it in class. Published lessons show the AI how you explain things."
      >
        {professor.status !== "suspended" ? (
          <Button asChild className="mb-4">
            <Link href="/teach/lessons/new">Write a model lesson</Link>
          </Button>
        ) : null}
        <LessonList lessons={lessons} canPublish={professor.status === "approved"} />
      </AccountSection>

      <AccountSection
        title={`Review AI lessons${queue.length ? ` (${queue.filter((q) => !q.reviewed_at).length} to review)` : ""}`}
        description="Sample Physics lessons written by the AI. Rate them, say what's wrong, and show how you'd put it. Your reviews teach the AI."
      >
        {professor.status !== "approved" ? (
          <p className="text-sm text-muted-foreground">You can review lessons once Krpex has approved your profile.</p>
        ) : queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons to review right now. We&apos;ll add more soon.</p>
        ) : (
          <ul className="grid min-w-0 gap-2" aria-label="Lessons to review">
            {queue.map((q) => (
              <li key={q.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={q.title}>
                    {q.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {languageName(q.language)} · {q.level}
                    {q.reviewed_at ? " · Reviewed ✓" : ""}
                  </p>
                </div>
                <Button asChild size="sm" variant={q.reviewed_at ? "outline" : "default"}>
                  <Link href={`/teach/review/${q.id}`} aria-label={`${q.reviewed_at ? "Edit your review of" : "Review"} ${q.title}`}>
                    {q.reviewed_at ? "Edit review" : "Review"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </AccountSection>

      <details className="rounded-xl border bg-card p-5 md:p-6">
        <summary className="cursor-pointer font-semibold">The agreement you accepted</summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Version {professor.agreement_version}, accepted {new Date(professor.agreement_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </p>
        <div className="mt-4">
          <AgreementText />
        </div>
      </details>
    </main>
  )
}
