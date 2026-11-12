import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminHeading, AdminSection, auditText, inr, Pill, Tile, usd, when } from "@/components/admin/ui"
import { CommunityBanForm, ProfileVisibilityForm } from "@/components/learn/admin-community"
import { GrantForm } from "@/components/learn/admin-forms"
import { getUser, requireAdmin } from "@/lib/admin/data"
import { PRODUCTS, type ProductId } from "@/lib/learning/plans"

export const metadata = { title: "Learner — Admin — Krpex" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LEDGER: Record<string, string> = {
  purchase: "Bought",
  grant: "Given by Krpex",
  question: "Question",
  course: "Course",
  refund: "Refund",
  adjust: "Adjusted by Krpex",
}
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—")

/** A list of rows that reads well on a phone: main text on the left, details under or beside it. */
function Rows({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ul aria-label={label} className="divide-y rounded-lg border text-sm">
      {children}
    </ul>
  )
}
function Row({ main, side, sub }: { main: React.ReactNode; side?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
      <div className="min-w-0">
        <div className="break-words">{main}</div>
        {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
      </div>
      {side ? <div className="text-xs tabular-nums text-muted-foreground">{side}</div> : null}
    </li>
  )
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>

export default async function AdminLearner({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { data: u, error } = await getUser(id.toLowerCase())
  if (!u && !error) notFound()
  if (!u) return <AdminHeading title="Learner" errors={[error]} />

  const a = u.account
  const pro = u.plan.plan === "pro"
  const paid = u.payments.filter((p) => p.status === "paid").reduce((n, p) => n + p.amount_paise, 0)
  const passed = u.courses.reduce((n, c) => n + c.passed, 0)
  const profile = u.community.profile

  return (
    <>
      <div className="grid gap-2">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← Users
        </Link>
        <AdminHeading title={a.full_name || a.email} errors={[error]} />
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span className="break-all">{a.email}</span>
          {pro ? <Pill tone="primary">Pro{u.plan.period_end ? ` until ${day(u.plan.period_end)}` : ""}</Pill> : <Pill>Free</Pill>}
          {a.admin ? <Pill tone="warn">Admin</Pill> : null}
          {a.professor ? <Pill tone="primary">Professor · {a.professor.status}</Pill> : null}
          {u.community.ban ? <Pill tone="danger">Can&apos;t post</Pill> : null}
          {!a.email_confirmed_at ? <Pill tone="warn">Email not confirmed</Pill> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          Joined {when(a.created_at)} · last sign-in {when(a.last_sign_in_at)}
          {a.providers.length ? ` · signs in with ${a.providers.join(", ")}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile label="Credits" value={u.credits} />
        <Tile label="Level" value={u.xp.level} sub={`${u.xp.total} XP · ${u.xp.week} this week`} />
        <Tile label="Courses" value={u.courses.length} sub={`${passed} lessons passed`} />
        <Tile label="Code" value={u.code.solved} sub={`solved · ${u.code.submissions} runs`} />
        <Tile label="AI cost (30 days)" value={usd(u.ai.usd_30d)} sub={`${usd(u.ai.usd)} all time`} />
        <Tile label="Paid" value={inr(paid)} sub={`${u.payments.filter((p) => p.status === "paid").length} orders`} />
      </div>

      <AdminSection title="Credits and Pro" description="Applied immediately. Negative credits take credits away; Pro days add to any Pro time left.">
        <GrantForm email={a.email} />
        <h3 className="mb-2 mt-5 text-sm font-medium">Credit history</h3>
        {u.ledger.length === 0 ? (
          <Empty>No credits used or given yet.</Empty>
        ) : (
          <Rows label="Credit history">
            {u.ledger.map((l, i) => (
              <Row
                key={i}
                main={
                  <span className="tabular-nums">
                    <span className={l.delta > 0 ? "font-medium text-green-700 dark:text-green-400" : "font-medium"}>
                      {l.delta > 0 ? "+" : ""}
                      {l.delta}
                    </span>{" "}
                    {LEDGER[l.reason] ?? l.reason}
                  </span>
                }
                sub={l.note || undefined}
                side={when(l.created_at)}
              />
            ))}
          </Rows>
        )}
      </AdminSection>

      <AdminSection title="Learning">
        {u.learner ? (
          <p className="mb-3 text-sm">
            <span className="text-muted-foreground">Goal: </span>
            {u.learner.goal} <span className="text-muted-foreground">· {u.learner.level} · teaching in {u.learner.language === "hi" ? "Hindi" : "English"}</span>
          </p>
        ) : null}
        {u.courses.length === 0 ? (
          <Empty>No courses yet.</Empty>
        ) : (
          <Rows label="Courses">
            {u.courses.map((c) => (
              <Row
                key={c.id}
                main={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{c.title}</span>
                    {c.status !== "active" ? <Pill>{c.status}</Pill> : null}
                    {c.certificate ? (
                      <Link href={`/certificate/${c.certificate}`} className="text-xs text-primary hover:underline">
                        Certificate
                      </Link>
                    ) : null}
                  </span>
                }
                sub={
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <span className="block h-full bg-primary" style={{ width: `${c.lessons ? Math.round((c.passed / c.lessons) * 100) : 0}%` }} />
                    </span>
                    {c.passed}/{c.lessons} lessons · started {day(c.created_at)}
                    {c.last_passed ? ` · last passed ${day(c.last_passed)}` : ""}
                  </span>
                }
              />
            ))}
          </Rows>
        )}
      </AdminSection>

      <AdminSection
        title="AI use"
        description="Cost covers questions to the professor and the coding coach. Course plans and lessons are counted here and costed on the Overview."
      >
        <Rows label="AI use">
          <Row main="Lessons written" side={u.ai.lessons_written} />
          <Row main="Courses created" side={u.ai.courses_created} />
          <Row main="Questions answered" side={`${u.ai.questions} (${u.ai.questions_30d} in 30 days)`} />
          <Row main="Coding coach replies" side={`${u.ai.coach} (${u.ai.coach_30d} in 30 days)`} />
        </Rows>
      </AdminSection>

      <AdminSection title="Payments">
        {u.payments.length === 0 ? (
          <Empty>No payments.</Empty>
        ) : (
          <Rows label="Payments">
            {u.payments.map((p, i) => (
              <Row
                key={i}
                main={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium tabular-nums">{inr(p.amount_paise)}</span> {PRODUCTS[p.product as ProductId]?.label ?? p.product}
                    {p.status === "paid" ? null : <Pill tone="warn">{p.status === "created" ? "Not completed" : p.status}</Pill>}
                  </span>
                }
                sub={p.razorpay_payment_id ? <span className="font-mono">{p.razorpay_payment_id}</span> : undefined}
                side={when(p.paid_at ?? p.created_at)}
              />
            ))}
          </Rows>
        )}
      </AdminSection>

      <AdminSection title="Code">
        <p className="mb-3 text-sm text-muted-foreground">
          {u.code.solved} problems solved · {u.code.submissions} submissions · following {u.code.plans} {u.code.plans === 1 ? "plan" : "plans"}
        </p>
        {u.code.recent.length === 0 ? (
          <Empty>No submissions yet.</Empty>
        ) : (
          <Rows label="Recent submissions">
            {u.code.recent.map((s, i) => (
              <Row
                key={i}
                main={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {s.title} {s.solved ? <Pill tone="primary">Accepted</Pill> : <Pill>{`${s.passed}/${s.total} tests`}</Pill>}
                  </span>
                }
                sub={s.language === "python" ? "Python" : "JavaScript"}
                side={when(s.created_at)}
              />
            ))}
          </Rows>
        )}
      </AdminSection>

      <AdminSection title="Community">
        {!profile ? (
          <Empty>No handle yet, so they can&apos;t post.</Empty>
        ) : (
          <div className="grid gap-4">
            <p className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium">@{profile.handle}</span>
              <span className="text-muted-foreground">· {profile.display_name}</span>
              {profile.hidden ? <Pill tone="danger">Profile hidden</Pill> : profile.is_public ? <Pill>Public profile</Pill> : <Pill>Private profile</Pill>}
              {profile.is_public && !profile.hidden ? (
                <a href={`/community/u/${profile.handle}`} className="text-xs text-primary hover:underline">
                  View
                </a>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              {u.community.posts} posts · {u.community.comments} comments · {u.community.removed} removed · reported {u.community.reports_received} times · made{" "}
              {u.community.reports_made} reports
            </p>
            {u.community.ban ? (
              <p role="status" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
                Can&apos;t post {u.community.ban.until ? `until ${when(u.community.ban.until)}` : "any more"}
                {u.community.ban.reason ? ` — ${u.community.ban.reason}` : ""}
              </p>
            ) : null}
            <div className="grid gap-2">
              <p className="text-sm font-medium">Posting</p>
              <CommunityBanForm handle={profile.handle} banned={Boolean(u.community.ban)} />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Profile page</p>
              <ProfileVisibilityForm handle={profile.handle} hidden={profile.hidden} />
            </div>
            {u.community.recent.length ? (
              <Rows label="Recent posts">
                {u.community.recent.map((p) => (
                  <Row
                    key={p.id}
                    main={
                      <span className="flex flex-wrap items-center gap-1.5">
                        <a href={p.path} className="hover:underline">
                          {p.title}
                        </a>
                        {p.status !== "visible" ? <Pill tone={p.status === "removed" ? "danger" : "warn"}>{p.status}</Pill> : null}
                      </span>
                    }
                    sub={`${p.kind === "solution" ? "Solution" : "Discussion"} · ${p.score} upvotes · ${p.comment_count} comments`}
                    side={when(p.created_at)}
                  />
                ))}
              </Rows>
            ) : null}
          </div>
        )}
      </AdminSection>

      {u.lesson_reports.length ? (
        <AdminSection title="Lesson reports they sent">
          <Rows label="Lesson reports">
            {u.lesson_reports.map((r, i) => (
              <Row
                key={i}
                main={
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Pill>{r.reason}</Pill> {r.lesson} {r.status === "open" ? <Pill tone="warn">Open</Pill> : null}
                  </span>
                }
                sub={r.details || undefined}
                side={when(r.created_at)}
              />
            ))}
          </Rows>
        </AdminSection>
      ) : null}

      <AdminSection title="Admin history" description="What admins did to this account, newest first.">
        {u.audit.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <Rows label="Admin history">
            {u.audit.map((e, i) => (
              <Row
                key={i}
                main={auditText(e)}
                sub={[e.admin ? `by ${e.admin}` : null, typeof e.detail.note === "string" ? e.detail.note : null, typeof e.detail.reason === "string" ? e.detail.reason : null]
                  .filter(Boolean)
                  .join(" · ")}
                side={when(e.at)}
              />
            ))}
          </Rows>
        )}
      </AdminSection>
    </>
  )
}
