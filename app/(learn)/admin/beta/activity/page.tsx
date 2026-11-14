import Link from "next/link"
import { headers } from "next/headers"

import { BetaTabs } from "@/components/admin/beta-tabs"
import { AdminHeading, AdminSection, Pill, Tile, td, th, when } from "@/components/admin/ui"
import { getBetaActivity, getFeedbackList, getTesterActivity, requireAdmin, type BetaActivity, type TesterEvent } from "@/lib/admin/data"
import { testerCodeSync } from "@/lib/beta/tester-code-server"
import { requestHost } from "@/lib/code-host"
import { feedbackPageHref, siteLabel } from "@/lib/feedback/options"

export const metadata = { title: "Activity — Beta — Admin — Krpex" }

type Params = { days?: string; tester?: string }

const PERIODS = [7, 30, 90]
const FUNNEL: { key: keyof BetaActivity["funnel"]; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "approved", label: "Approved" },
  { key: "signed_in", label: "Came in after approval" },
  { key: "onboarded", label: "Finished onboarding" },
  { key: "lesson_opened", label: "Opened a lesson" },
  { key: "lesson_finished", label: "Finished a lesson" },
  { key: "day_2", label: "Came back another day" },
  { key: "week_2", label: "Still coming after 7 days" },
]
const SITES = ["main", "code", "community"] as const
const SESSION_GAP_MS = 30 * 60_000

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—")
const secs = (s: number | null) => (s == null ? "" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`)
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
const CLARITY = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
/** Clarity's recordings for this project; filter by the custom tag "tester" there. */
const recordingsHref = CLARITY ? `https://clarity.microsoft.com/projects/view/${CLARITY}/impressions` : null
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Splits a timeline (newest first) into sessions: a gap of 30 minutes or more starts a new one. */
function sessions(events: TesterEvent[]) {
  const out: TesterEvent[][] = []
  let prevStart: number | null = null
  for (const e of events) {
    const at = new Date(e.at).getTime()
    const end = at + (e.seconds ?? 0) * 1000
    if (prevStart === null || prevStart - end > SESSION_GAP_MS) out.push([])
    out[out.length - 1].push(e)
    prevStart = at
  }
  return out
}

export default async function AdminBetaActivity({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const days = PERIODS.includes(Number(p.days)) ? Number(p.days) : 30
  const tester = p.tester && uuid.test(p.tester) ? p.tester : null
  const [{ data, error }, one, feedback, host] = await Promise.all([
    getBetaActivity(days),
    tester ? getTesterActivity(tester, days) : Promise.resolve(null),
    getFeedbackList("new", "", "", "", 1),
    headers().then(requestHost),
  ])
  const href = (o: { days?: number; tester?: string | null }) => {
    const qs = new URLSearchParams()
    const d = o.days ?? days
    if (d !== 30) qs.set("days", String(d))
    const t = o.tester === undefined ? tester : o.tester
    if (t) qs.set("tester", t)
    const s = qs.toString()
    return `/admin/beta/activity${s ? `?${s}` : ""}`
  }
  const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`
  const f = data?.funnel
  const s = data?.sites

  return (
    <>
      <AdminHeading
        title="Beta"
        note="What approved testers who agreed to tracking do on krpex.in, Krpex Code and Krpex Community. Pages are kept 90 days; lessons, code and posts come from their own records. Times are in India time. Session recordings are in Microsoft Clarity: filter by the tag “tester” with a tester's recording tag."
        errors={[error, one?.error ?? null]}
      />
      <BetaTabs current="activity" newFeedback={feedback.data?.counts.new} />

      <nav aria-label="Period" className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Pages and timelines from the last</span>
        {PERIODS.map((d) => (
          <Link key={d} href={href({ days: d })} aria-current={d === days ? "page" : undefined} className={tabClass(d === days)}>
            {d} days
          </Link>
        ))}
      </nav>

      {tester ? (
        <AdminSection
          title={one?.data ? `${one.data.tester.name ?? one.data.tester.email}` : "Tester not found"}
          description={
            one?.data ? (
              <>
                {one.data.tester.email} · {one.data.tester.status === "approved" ? `approved ${when(one.data.tester.approved_at)}` : one.data.tester.status} ·{" "}
                {one.data.tester.active_days} active day{one.data.tester.active_days === 1 ? "" : "s"} · last seen {when(one.data.tester.last_seen)} ·{" "}
                <Link href={`/admin/users/${tester}`} className="text-primary hover:underline">
                  account
                </Link>{" "}
                · recordings tagged <code className="font-mono">{testerCodeSync(tester)}</code>
                {recordingsHref ? (
                  <>
                    {" "}
                    in{" "}
                    <a href={recordingsHref} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Clarity
                    </a>
                  </>
                ) : null}{" "}
                ·{" "}
                <Link href={href({ tester: null })} className="text-primary hover:underline">
                  all testers
                </Link>
              </>
            ) : (
              <Link href={href({ tester: null })} className="text-primary hover:underline">
                Back to all testers
              </Link>
            )
          }
        >
          {!one?.data || one.data.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in the last {days} days.</p>
          ) : (
            <ol className="grid gap-4" aria-label="Sessions">
              {sessions(one.data.events).map((group) => {
                const first = group[group.length - 1]
                const pages = group.filter((e) => e.kind === "page").length
                return (
                  <li key={first.at} className="rounded-lg border">
                    <p className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{day(first.at)}</span> · {time(first.at)}–{time(group[0].at)} · {pages} page{pages === 1 ? "" : "s"}
                      {group.length > pages ? ` · ${group.length - pages} action${group.length - pages === 1 ? "" : "s"}` : ""}
                    </p>
                    <ul className="divide-y text-sm">
                      {[...group].reverse().map((e, i) => (
                        <li key={i} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-3 px-4 py-1.5">
                          <span className="text-xs tabular-nums text-muted-foreground">{time(e.at)}</span>
                          {e.kind === "page" ? (
                            <span className="min-w-0 break-all">
                              <span className="text-xs text-muted-foreground">{siteLabel(e.site)} </span>
                              <a href={feedbackPageHref(e.site, e.title, host)} target="_blank" rel="noreferrer" className="hover:underline">
                                {e.title}
                              </a>
                              {e.detail && e.detail !== e.title ? <span className="text-xs text-muted-foreground"> from {e.detail}</span> : null}
                            </span>
                          ) : (
                            <span className="min-w-0 break-words">
                              <Pill tone="primary">{e.title}</Pill> <span className="text-muted-foreground">{e.detail}</span>
                            </span>
                          )}
                          <span className="text-xs tabular-nums text-muted-foreground">{secs(e.seconds)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ol>
          )}
        </AdminSection>
      ) : (
        <>
          <AdminSection title="Funnel" description="Applied testers, all time. Each step counts testers who got that far.">
            {f ? (
              <ul className="grid gap-2 text-sm" aria-label="Funnel">
                {FUNNEL.map((x) => (
                  <li key={x.key} className="grid grid-cols-[minmax(0,12rem)_3rem_3rem_1fr] items-center gap-3">
                    <span>{x.label}</span>
                    <span className="text-right font-medium tabular-nums">{f[x.key].toLocaleString("en-IN")}</span>
                    <span className="text-right text-xs tabular-nums text-muted-foreground">{pct(f[x.key], f.applied)}</span>
                    <span className="h-2 rounded-full bg-muted" aria-hidden>
                      <span className="block h-2 rounded-full bg-primary" style={{ width: f.applied ? `${(f[x.key] / f.applied) * 100}%` : 0 }} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </AdminSection>

          <AdminSection title="Sites" description="Approved testers who used each site, and who moved between them.">
            {s ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile label="Used krpex.in" value={s.main} />
                <Tile label="Used Krpex Code" value={s.code} sub={`${s.code_submitted} submitted code`} />
                <Tile label="Used Krpex Community" value={s.community} sub={`${s.community_posted} posted or commented`} />
                <Tile label="Used two or more sites" value={s.two_or_more} sub={`${s.all_three} used all three`} />
              </div>
            ) : null}
          </AdminSection>

          {SITES.map((site) => {
            const rows = (data?.pages ?? []).filter((r) => r.site === site)
            const top = rows.slice(0, 10)
            const least = rows.length > 15 ? [...rows.slice(10)].reverse().slice(0, 5) : []
            const table = (list: typeof rows, label: string) => (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm" aria-label={label}>
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className={th}>Page</th>
                      <th className={`${th} text-right`}>Views</th>
                      <th className={`${th} text-right`}>Testers</th>
                      <th className={`${th} text-right`}>Avg time</th>
                      <th className={`${th} text-right`}>Sessions ended here</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((r) => (
                      <tr key={r.page}>
                        <td className={`${td} max-w-72 truncate`} title={r.page}>
                          {r.page}
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{r.views}</td>
                        <td className={`${td} text-right tabular-nums`}>{r.testers}</td>
                        <td className={`${td} text-right tabular-nums`}>{secs(r.avg_seconds)}</td>
                        <td className={`${td} text-right tabular-nums`}>
                          {r.exits} <span className="text-xs text-muted-foreground">({pct(r.exits, r.views)})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            return (
              <AdminSection key={site} title={`${siteLabel(site)} pages`} description={`Last ${days} days. Ids in addresses are grouped as :id.`}>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No visits yet.</p>
                ) : (
                  <div className="grid gap-4">
                    {table(top, `Most used ${siteLabel(site)} pages`)}
                    {least.length ? (
                      <>
                        <p className="text-sm font-medium">Least used</p>
                        {table(least, `Least used ${siteLabel(site)} pages`)}
                      </>
                    ) : null}
                  </div>
                )}
              </AdminSection>
            )
          })}

          <AdminSection title={`Testers (${data?.testers.length ?? 0})`} description="Approved testers, most recently seen first. Open one for their timeline.">
            {!data || data.testers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved testers yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm" aria-label="Testers">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className={th}>Tester</th>
                      <th className={th}>Last seen</th>
                      <th className={`${th} text-right`}>Active days</th>
                      <th className={`${th} text-right`}>Pages</th>
                      <th className={th}>Sites</th>
                      <th className={th}>Recording tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.testers.map((t) => (
                      <tr key={t.user_id}>
                        <td className={td}>
                          <Link href={href({ tester: t.user_id })} className="font-medium hover:underline">
                            {t.name ?? t.email}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{t.email}</span>
                        </td>
                        <td className={td}>{t.last_seen ? when(t.last_seen) : "Not yet"}</td>
                        <td className={`${td} text-right tabular-nums`}>{t.active_days}</td>
                        <td className={`${td} text-right tabular-nums`}>{t.views}</td>
                        <td className={td}>{t.sites.map(siteLabel).join(", ") || "—"}</td>
                        <td className={`${td} font-mono text-xs`}>{testerCodeSync(t.user_id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSection>
        </>
      )}
    </>
  )
}
