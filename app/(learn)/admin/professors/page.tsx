import Link from "next/link"

import { AdminHeading, AdminSection, when } from "@/components/admin/ui"
import {
  GenerateReviewLessonForm,
  InviteProfessorForm,
  ProfessorLiveButton,
  ProfessorStatusButtons,
  ReviewLessonStatusButton,
  RevokeInviteButton,
} from "@/components/learn/admin-forms"
import { getProfessors, getReviewLessons, requireAdmin } from "@/lib/admin/data"
import { average, RATING_CRITERIA } from "@/lib/teach/reviews"
import { languageName, subjectName, TEACH_SUBJECTS } from "@/lib/teach/subjects"

export const metadata = { title: "Professors — Admin — Krpex" }

export default async function AdminProfessors() {
  await requireAdmin()
  const [profs, review] = await Promise.all([getProfessors(), getReviewLessons()])
  const { professors, invites } = profs.data
  const reviewLessons = review.data
  return (
    <>
      <AdminHeading title="Professors" errors={[profs.error, review.error]} />

      <AdminSection
        title={`Professors (${professors.length})`}
        description="Invite a professor by email, check their qualifications, then approve them. Approved professors can publish material."
      >
        <InviteProfessorForm subjects={TEACH_SUBJECTS} />
        {invites.length ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">Open invites</p>
            <ul className="grid gap-1 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {i.email} · {subjectName(i.subject)} · expires {new Date(i.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                  <RevokeInviteButton id={i.id} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {professors.length ? (
          <ul className="mt-4 grid gap-3">
            {professors.map((p) => (
              <li key={p.id} className="grid gap-1 rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {p.display_name} <span className="font-normal text-muted-foreground">· {p.email}</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.status === "approved" && (p.listing_requested || p.live) ? (
                      <ProfessorLiveButton id={p.id} live={Boolean(p.live)} name={p.display_name} />
                    ) : null}
                    <ProfessorStatusButtons id={p.id} status={p.status} />
                  </div>
                </div>
                <p className="text-muted-foreground">
                  {p.status}
                  {p.live ? " · live for learners" : p.listing_requested ? " · asked to go live" : ""} · {subjectName(p.subject)} · {p.languages.join(", ")} ·{" "}
                  {p.materials} files ({p.published} published, {p.pages} pages) · {p.lessons ?? 0} lessons ({p.lessons_published ?? 0} published) ·{" "}
                  {p.recording_minutes_month ?? 0} recording min this month
                </p>
                {[p.title, p.institution].filter(Boolean).length ? <p>{[p.title, p.institution].filter(Boolean).join(", ")}</p> : null}
                {p.credentials ? <p className="whitespace-pre-wrap text-muted-foreground">{p.credentials}</p> : null}
                {p.teaching_style ? (
                  <p className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">How they teach: </span>
                    {p.teaching_style}
                  </p>
                ) : null}
                {p.live ? (
                  <Link href={`/professors/${p.id}`} className="text-primary hover:underline">
                    Public page
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminSection>

      <AdminSection
        title={`Lessons for review (${reviewLessons.length})`}
        description="Sample Physics lessons written by the AI, with no learner data. Approved professors in that language rate and correct them."
      >
        <GenerateReviewLessonForm />
        {reviewLessons.length ? (
          <ul className="mt-4 grid gap-3" aria-label="Lessons for review">
            {reviewLessons.map((l) => (
              <li key={l.id} className="grid gap-2 rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{l.title}</span>
                  <ReviewLessonStatusButton id={l.id} status={l.status} title={l.title} />
                </div>
                <p className="text-muted-foreground">
                  {l.status} · {languageName(l.language)} · {l.level} · {l.blocks} blocks · {l.reviews.length} {l.reviews.length === 1 ? "review" : "reviews"}
                  {l.reviews.length ? ` · ${RATING_CRITERIA.map((c) => `${c.label} ${average(l.reviews.map((r) => r[c.key]))}`).join(", ")}` : ""}
                </p>
                {l.reviews.length ? (
                  <details>
                    <summary className="cursor-pointer text-primary">Read the reviews</summary>
                    <ul className="mt-2 grid gap-3">
                      {l.reviews.map((r, i) => (
                        <li key={i} className="grid gap-1 border-l-2 pl-3">
                          <p className="font-medium">
                            {r.professor}{" "}
                            <span className="font-normal text-muted-foreground">
                              · {RATING_CRITERIA.map((c) => `${c.label} ${r[c.key]}/5`).join(", ")} · {when(r.updated_at)}
                            </span>
                          </p>
                          {r.comment ? <p className="whitespace-pre-wrap">{r.comment}</p> : null}
                          {r.block_notes.map((n, j) => (
                            <div key={j} className="rounded bg-muted/50 p-2">
                              <p className="text-xs text-muted-foreground">Block {n.block + 1}</p>
                              {n.note ? <p className="whitespace-pre-wrap">{n.note}</p> : null}
                              {n.suggestion ? (
                                <p className="mt-1 whitespace-pre-wrap">
                                  <span className="text-xs text-muted-foreground">Suggested text: </span>
                                  {n.suggestion}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </AdminSection>
    </>
  )
}
