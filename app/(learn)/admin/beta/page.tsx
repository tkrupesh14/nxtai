import Link from "next/link"

import { AdminHeading, AdminSection, Pill, Tile, when } from "@/components/admin/ui"
import { BetaDecideForm } from "@/components/learn/admin-beta"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { BETA_PER_PAGE, getBetaList, requireAdmin, type BetaFilter } from "@/lib/admin/data"
import { BETA_DEVICES, BETA_ROLES } from "@/lib/beta/options"

import { setBetaClosedAction } from "../actions"

export const metadata = { title: "Beta — Admin — Krpex" }

type Params = { show?: string; q?: string; page?: string }

const SHOW: { id: BetaFilter; label: string }[] = [
  { id: "waiting", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "declined", label: "Declined" },
  { id: "existing", label: "Accounts from before the beta" },
]
const STATUS = { waiting: { label: "Waiting", tone: "warn" }, approved: { label: "Approved", tone: "primary" }, declined: { label: "Declined", tone: "muted" } } as const
const label = (list: { id: string; label: string }[], id: string | null) => (id ? (list.find((x) => x.id === id)?.label ?? id) : "—")
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`

export default async function AdminBeta({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const show: BetaFilter = SHOW.some((s) => s.id === p.show) ? (p.show as BetaFilter) : "waiting"
  const q = (p.q ?? "").slice(0, 100)
  const page = Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1))
  const { data, error } = await getBetaList(show, q, page)
  const href = (o: { show?: BetaFilter; page?: number }) => {
    const qs = new URLSearchParams()
    const s = o.show ?? show
    if (s !== "waiting") qs.set("show", s)
    if (q && !o.show) qs.set("q", q)
    if ((o.page ?? 1) > 1) qs.set("page", String(o.page))
    const str = qs.toString()
    return `/admin/beta${str ? `?${str}` : ""}`
  }
  const counts = data?.counts ?? { waiting: 0, approved: 0, declined: 0, existing: 0 }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / BETA_PER_PAGE))

  return (
    <>
      <AdminHeading
        title="Beta"
        note="Applications for the closed beta. Approved testers can use krpex.in courses, Krpex Code and Krpex Community; approving gives Pro and tells them by notification and email."
        errors={[error]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Waiting" value={counts.waiting.toLocaleString("en-IN")} />
        <Tile label="Approved testers" value={counts.approved.toLocaleString("en-IN")} />
        <Tile label="Declined" value={counts.declined.toLocaleString("en-IN")} />
        <Tile label="From before the beta" value={counts.existing.toLocaleString("en-IN")} sub="kept their access" />
      </div>

      <AdminSection
        title={data?.closed === false ? "The beta has ended" : "The beta is closed"}
        description={
          data?.closed === false
            ? "Everyone can use Krpex. Closing it again keeps everyone already approved and blocks new accounts until you approve them."
            : "Only approved testers, admins and professors get in. Ending it lets everyone in, including people waiting or declined."
        }
      >
        <form action={setBetaClosedAction.bind(null, data?.closed === false)}>
          <Button type="submit" size="sm" variant={data?.closed === false ? "outline" : "default"}>
            {data?.closed === false ? "Close the beta again" : "End the beta: let everyone in"}
          </Button>
        </form>
      </AdminSection>

      <AdminSection title={`${SHOW.find((s) => s.id === show)!.label} (${(data?.total ?? 0).toLocaleString("en-IN")})`}>
        <nav aria-label="Applications" className="mb-4 flex flex-wrap gap-2 text-sm">
          {SHOW.map((s) => (
            <Link key={s.id} href={href({ show: s.id })} aria-current={s.id === show ? "page" : undefined} className={tabClass(s.id === show)}>
              {s.label} {counts[s.id as keyof typeof counts] ? `· ${counts[s.id as keyof typeof counts]}` : ""}
            </Link>
          ))}
        </nav>
        <form action="/admin/beta" className="mb-4 flex flex-wrap items-center gap-2">
          {show !== "waiting" ? <input type="hidden" name="show" value={show} /> : null}
          <Input name="q" defaultValue={q} placeholder="Email, name or what they want to learn" aria-label="Search applications" className="h-9 w-full sm:w-72" />
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Search
          </Button>
          {q ? (
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href={href({ show })}>Clear</Link>
            </Button>
          ) : null}
        </form>

        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{show === "waiting" && !q ? "No one is waiting." : "Nothing here."}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Beta applications">
            {data.rows.map((r) => (
              <li key={r.user_id} className="grid gap-2 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Link href={`/admin/users/${r.user_id}`} className="font-medium hover:underline">
                      {r.name ?? r.email}
                    </Link>
                    <span className="break-all text-muted-foreground">{r.email}</span>
                    {r.source === "applied" ? <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill> : <Pill>Before the beta</Pill>}
                    {r.plan === "pro" ? <Pill>Pro</Pill> : null}
                  </p>
                  <span className="text-xs tabular-nums text-muted-foreground">{r.source === "applied" ? `applied ${when(r.created_at)}` : `last signed in ${when(r.last_sign_in_at)}`}</span>
                </div>
                {r.source === "applied" ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {label(BETA_ROLES, r.role)} · {label(BETA_DEVICES, r.device)}
                      {r.heard_from ? ` · heard from: ${r.heard_from}` : ""}
                      {r.consent_at ? " · agreed to tracking and recording" : ""}
                    </p>
                    {r.goal ? <p className="break-words">{r.goal}</p> : null}
                    {r.decided_at ? (
                      <p className="text-xs text-muted-foreground">
                        {STATUS[r.status].label} {when(r.decided_at)}
                        {r.decided_by ? ` by ${r.decided_by}` : ""}
                        {r.pro_days ? ` · ${r.pro_days} days of Pro given` : ""}
                        {r.note ? ` · ${r.note}` : ""}
                      </p>
                    ) : r.note ? (
                      <p className="text-xs text-muted-foreground">Note: {r.note}</p>
                    ) : null}
                    <BetaDecideForm userId={r.user_id} name={r.name ?? r.email} status={r.status} proGiven={Boolean(r.pro_days)} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="text-primary hover:underline">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Link href={href({ page: page + 1 })} className="text-primary hover:underline">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </AdminSection>
    </>
  )
}
