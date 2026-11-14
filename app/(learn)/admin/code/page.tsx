import Link from "next/link"

import { AdminHeading, AdminSection, Pill, rupees, td, th, Tile, when } from "@/components/admin/ui"
import { getCode, requireAdmin, type MoneyDays } from "@/lib/admin/data"
import { codeLinks } from "@/lib/code/host"

export const metadata = { title: "Code — Admin — Krpex" }

type Params = { days?: string; sort?: string }

const RANGES: MoneyDays[] = [7, 30, 90]
const SORTS = [
  { id: "busy", label: "Most submissions" },
  { id: "hard", label: "Lowest solve rate" },
] as const
const COACH_KINDS: Record<string, string> = { hint: "Hints", error: "Explain an error", review: "Code review" }
const n = (v: number) => Number(v).toLocaleString("en-IN")
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—")
const day = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Kolkata" })
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`
const num = `${td} text-right tabular-nums`

function Table({ label, head, children }: { label: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" aria-label={label}>
        <thead className="bg-muted/50">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`${th} ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Difficulty({ d }: { d: string }) {
  return <Pill tone={d === "hard" ? "danger" : d === "medium" ? "warn" : "muted"}>{d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard"}</Pill>
}

export default async function AdminCode({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const days: MoneyDays = p.days === "7" ? 7 : p.days === "90" ? 90 : 30
  const sort = p.sort === "hard" ? "hard" : "busy"
  const [stats, links] = await Promise.all([getCode(days), codeLinks()])
  const c = stats.data
  const href = (o: { days?: MoneyDays; sort?: string }) => {
    const qs = new URLSearchParams()
    const d = o.days ?? days
    const s = o.sort ?? sort
    if (d !== 30) qs.set("days", String(d))
    if (s !== "busy") qs.set("sort", s)
    const q = qs.toString()
    return `/admin/code${q ? `?${q}` : ""}`
  }
  if (!c) return <AdminHeading title="Code" errors={[stats.error ?? "No data"]} />

  const problems =
    sort === "hard"
      ? [...c.problems].filter((x) => x.tried > 0).sort((a, b) => a.solvers / a.tried - b.solvers / b.tried || b.tried - a.tried)
      : c.problems
  const langs = Object.entries(c.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([l, k]) => `${l === "python" ? "Python" : l === "javascript" ? "JavaScript" : l} ${pct(k, c.submissions)}`)
    .join(" · ")
  const runnerTotal = c.runner_errors.reduce((s, e) => s + Number(e.count), 0)

  return (
    <>
      <AdminHeading title="Code" note="Krpex Code practice: submissions, where learners get stuck, the AI coach and the code runner." errors={[stats.error]} />

      <nav aria-label="Period" className="flex flex-wrap gap-2 text-sm">
        {RANGES.map((r) => (
          <Link key={r} href={href({ days: r })} aria-current={r === days ? "page" : undefined} className={tabClass(r === days)}>
            Last {r} days
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="Submissions" value={n(c.submissions)} sub={langs || "none yet"} />
        <Tile label="Accepted" value={pct(c.accepted, c.submissions)} sub={`${n(c.accepted)} passed every test`} />
        <Tile label="Learners" value={n(c.learners)} sub={`${n(c.solvers)} solved at least one`} />
        <Tile label="Problems solved" value={`${n(c.problems_solved)} of ${n(c.problems_active)}`} sub={`${n(c.never_tried.length)} never tried by anyone`} />
        <Tile label="Coach" value={n(c.coach.requests)} sub={`${rupees(c.coach.inr)} AI · ${n(c.coach.failed)} failed`} />
        <Tile label="Runner errors" value={n(runnerTotal)} sub={runnerTotal ? "see below" : "none"} />
      </div>

      <AdminSection title="By day" description="India time, newest first.">
        <div className="max-h-[28rem] overflow-y-auto">
          <Table label="By day" head={["Day", "Submissions", "Accepted", "Learners", "Coach"]}>
            {c.daily.map((d) => (
              <tr key={d.day} className="border-t">
                <td className={td}>{day(d.day)}</td>
                <td className={num}>{d.submissions ? n(d.submissions) : "—"}</td>
                <td className={num}>{d.submissions ? pct(d.accepted, d.submissions) : "—"}</td>
                <td className={num}>{d.learners ? n(d.learners) : "—"}</td>
                <td className={num}>{d.coach ? n(d.coach) : "—"}</td>
              </tr>
            ))}
          </Table>
        </div>
      </AdminSection>

      <AdminSection
        title="Where learners get stuck"
        description="Problems at least 3 learners tried in this period, solved by fewer than a quarter of them. Check the statement and tests."
      >
        {c.stuck.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing stands out.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Stuck problems">
            {c.stuck.map((x) => (
              <li key={x.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <p className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <a href={links.code(`/p/${x.slug}`)} className="font-medium hover:underline">
                    {x.title}
                  </a>
                  <Difficulty d={x.difficulty} />
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {x.solvers} of {x.tried} solved · {x.reveals} looked at the answer
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title={`Problems (${c.problems.length})`} description="Every problem with activity in this period. Acceptance: submissions that passed every test. Solved: learners who got there, of those who tried.">
        <nav aria-label="Sort problems" className="mb-4 flex flex-wrap gap-2 text-sm">
          {SORTS.map((s) => (
            <Link key={s.id} href={href({ sort: s.id })} aria-current={s.id === sort ? "page" : undefined} className={tabClass(s.id === sort)}>
              {s.label}
            </Link>
          ))}
        </nav>
        {problems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions in this period.</p>
        ) : (
          <div className="max-h-[36rem] overflow-y-auto">
            <Table label="Problems" head={["Problem", "Submissions", "Acceptance", "Solved", "Answers seen", "Coach"]}>
              {problems.map((x) => (
                <tr key={x.slug} className="border-t">
                  <td className={`${td} min-w-48 whitespace-normal`}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <a href={links.code(`/p/${x.slug}`)} className="hover:underline">
                        {x.title}
                      </a>
                      <Difficulty d={x.difficulty} />
                      {x.active ? null : <Pill>Hidden</Pill>}
                    </span>
                  </td>
                  <td className={num}>{n(x.submissions)}</td>
                  <td className={num}>{pct(x.accepted, x.submissions)}</td>
                  <td className={num}>{x.tried ? `${n(x.solvers)} of ${n(x.tried)}` : "—"}</td>
                  <td className={num}>{x.reveals ? n(x.reveals) : "—"}</td>
                  <td className={num}>{x.coach ? n(x.coach) : "—"}</td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="AI coach" description={`${n(c.coach.learners)} learners asked the coach in this period. Paid: answered with a credit after the free allowance.`}>
        {c.coach.kinds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No coach requests in this period.</p>
        ) : (
          <Table label="AI coach" head={["Kind", "Requests", "Answered", "Failed", "Paid"]}>
            {c.coach.kinds.map((k) => (
              <tr key={k.kind} className="border-t">
                <td className={td}>{COACH_KINDS[k.kind] ?? k.kind}</td>
                <td className={num}>{n(k.requests)}</td>
                <td className={num}>{n(k.answered)}</td>
                <td className={num}>{k.failed ? n(k.failed) : "—"}</td>
                <td className={num}>{k.paid ? n(k.paid) : "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>

      <AdminSection title="Runner errors" description="The in-browser runner itself failing (Python not loading, the sandbox crashing), not learners' code. Recorded since this page went live.">
        {c.runner_errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runner errors in this period.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Runner errors">
            {c.runner_errors.map((e) => (
              <li key={e.message} className="grid gap-0.5 px-4 py-2.5">
                <p className="break-words font-medium">{e.message.replace(/^Code runner:\s*/, "")}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {n(e.count)}× · last {when(e.last)}
                  {e.path ? ` · ${e.path}` : ""}
                  {e.detail ? ` · ${e.detail.split("\n")[0]}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title={`Never tried (${c.never_tried.length})`} description="Live problems no one has submitted yet, ever.">
        {c.never_tried.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every problem has been tried.</p>
        ) : (
          <p className="text-sm leading-7">
            {c.never_tried.map((x, i) => (
              <span key={x.slug}>
                {i ? " · " : ""}
                <a href={links.code(`/p/${x.slug}`)} className="hover:underline">
                  {x.title}
                </a>
              </span>
            ))}
          </p>
        )}
      </AdminSection>
    </>
  )
}
