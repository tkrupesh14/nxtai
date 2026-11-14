import Link from "next/link"

import { AdminHeading, AdminSection, auditText, Pill, Tile, when } from "@/components/admin/ui"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { getAudit, getErrorGroups, getSystem, requireAdmin, type AppStart, type ErrorSource } from "@/lib/admin/data"

export const metadata = { title: "System — Admin — Krpex" }

type Params = { range?: string; from?: string; to?: string; source?: string; q?: string }

const RANGES = [
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 168 },
  { id: "30d", label: "Last 30 days", hours: 720 },
] as const
const KIND: Record<AppStart["kind"], { label: string; tone: "primary" | "muted" | "warn" }> = {
  deploy: { label: "Deploy", tone: "primary" },
  restart: { label: "Restart", tone: "muted" },
  rollback: { label: "Earlier version", tone: "warn" },
  unknown: { label: "Unknown build", tone: "muted" },
}
const DATE = /^\d{4}-\d{2}-\d{2}$/
const select = "h-9 rounded-md border bg-background px-2 text-sm"
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`
const day = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Kolkata" })
const istStart = (d: string) => new Date(`${d}T00:00:00+05:30`)
const minutes = (m: number) => (m >= 120 ? `${Math.round(m / 6) / 10} hours` : `${m} min`)

export default async function AdminSystem({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const range = RANGES.find((r) => r.id === p.range) ?? RANGES[0]
  const custom = Boolean(p.from && DATE.test(p.from))
  const source: ErrorSource = p.source === "server" || p.source === "client" ? p.source : "all"
  const q = (p.q ?? "").slice(0, 100)
  // A custom range is whole days in India time, "to" included.
  const from = custom ? istStart(p.from!).toISOString() : new Date(Date.now() - range.hours * 3600_000).toISOString()
  const to = custom && p.to && DATE.test(p.to) ? new Date(istStart(p.to).getTime() + 86400_000).toISOString() : null

  const [errors, system, audit] = await Promise.all([getErrorGroups(from, to, source, q), getSystem(range.hours), getAudit(50)])
  const e = errors.data
  const s = system.data
  const last = s?.last_check
  const lastAge = last ? (Date.now() - new Date(last.at).getTime()) / 60000 : null
  const status = !last ? null : lastAge! > 12 ? "No recent check" : last.ok ? "Up" : "Can't reach the database"
  const uptime = s && s.span_minutes > 0 ? Math.max(0, Math.min(100, 100 - (Number(s.down_minutes) / s.span_minutes) * 100)) : null
  const rangeHref = (id: string) => `/admin/system${id === "24h" ? "" : `?range=${id}`}`
  const filtered = custom || source !== "all" || q

  return (
    <>
      <AdminHeading title="System" note="Health checks, deploys and errors." errors={[errors.error, system.error, audit.error]} />

      <nav aria-label="Period" className="flex flex-wrap gap-2 text-sm">
        {RANGES.map((r) => (
          <Link key={r.id} href={rangeHref(r.id)} aria-current={!custom && r.id === range.id ? "page" : undefined} className={tabClass(!custom && r.id === range.id)}>
            {r.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Now" value={status ?? "—"} sub={last ? `checked ${when(last.at)}${last.commit ? ` · ${last.commit}` : ""}` : "no checks yet"} />
        <Tile label="Uptime" value={uptime === null ? "—" : `${uptime.toFixed(uptime >= 99.95 ? 0 : 2)}%`} sub={s && Number(s.down_minutes) > 0 ? `${minutes(Number(s.down_minutes))} down` : `${range.label.toLowerCase()}`} />
        <Tile label="Database response" value={s?.avg_ms != null ? `${s.avg_ms} ms` : "—"} sub={s?.max_ms != null ? `slowest ${s.max_ms} ms · ${s.failed} failed` : undefined} />
        <Tile label="Server memory" value={last?.rss_mb != null ? `${last.rss_mb} MB` : "—"} sub={s?.max_rss_mb != null ? `peak ${s.max_rss_mb} MB` : undefined} />
      </div>

      <AdminSection
        title="Health checks"
        description={`Every 5 minutes the server checks it can reach the database. More than 12 minutes without a check means it was down or restarting.${s?.first_check ? ` Checks since ${when(s.first_check)}.` : ""}`}
      >
        {!s || s.checks === 0 ? (
          <p className="text-sm text-muted-foreground">No checks in this period. The first one is recorded a minute after the server starts.</p>
        ) : s.downtime.length === 0 && s.failures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All {s.checks.toLocaleString("en-IN")} checks passed, with no gaps.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Health problems">
            {s.downtime.map((d) => (
              <li key={`down-${d.from}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="danger">Down</Pill> {d.to ? `${when(d.from)} – ${when(d.to)}` : `since ${when(d.from)}`}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">about {minutes(d.minutes)}</p>
              </li>
            ))}
            {s.failures.map((f) => (
              <li key={`fail-${f.at}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <p className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="warn">Database</Pill> {f.database} at {when(f.at)}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">{f.ms} ms</p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Deploys and restarts" description="Each time the server started, newest first (latest 30). A restart runs the same version again, for example after a crash.">
        {!s || s.starts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet. Starts are recorded from the next deploy.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Deploys and restarts">
            {s.starts.map((x, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={KIND[x.kind].tone}>{KIND[x.kind].label}</Pill>
                    {x.commit ? <span className="font-mono text-xs">{x.commit}</span> : null}
                    {x.dirty ? <Pill tone="warn">Uncommitted changes</Pill> : null}
                  </p>
                  {x.subject ? <p className="mt-0.5 break-words text-xs text-muted-foreground">{x.subject}</p> : null}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{when(x.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        title={`Errors (${e.total.toLocaleString("en-IN")})`}
        description={`Server crashes and browser errors, grouped by message${custom ? ` from ${day(p.from!)}${p.to && DATE.test(p.to) ? ` to ${day(p.to)}` : ""}` : `, ${range.label.toLowerCase()}`}. ${e.server} server · ${e.client} browser.`}
      >
        <form action="/admin/system" className="mb-4 flex flex-wrap items-end gap-2">
          {!custom && range.id !== "24h" ? <input type="hidden" name="range" value={range.id} /> : null}
          <Input name="q" defaultValue={q} placeholder="Search message or page" aria-label="Search errors" className="h-9 w-full sm:w-56" />
          <select name="source" defaultValue={source} aria-label="Source" className={select}>
            <option value="all">Server and browser</option>
            <option value="server">Server</option>
            <option value="client">Browser</option>
          </select>
          <label className="grid gap-0.5 text-xs text-muted-foreground">
            From
            <Input type="date" name="from" defaultValue={custom ? p.from : ""} className="h-9 w-40" />
          </label>
          <label className="grid gap-0.5 text-xs text-muted-foreground">
            To
            <Input type="date" name="to" defaultValue={custom && p.to ? p.to : ""} className="h-9 w-40" />
          </label>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Show
          </Button>
          {filtered ? (
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href={rangeHref(range.id)}>Clear</Link>
            </Button>
          ) : null}
        </form>

        {e.by_day.length > 1 ? (
          <p className="mb-3 text-xs text-muted-foreground">
            By day:{" "}
            {e.by_day
              .slice(0, 14)
              .map((d) => `${day(d.day)} ${d.server + d.client}`)
              .join(" · ")}
          </p>
        ) : null}

        {e.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors. 🎉</p>
        ) : (
          <ul className="grid gap-2" aria-label="Errors">
            {e.groups.map((g, i) => (
              <li key={i} className="rounded-lg border text-sm">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
                    <Pill>{g.source === "server" ? "Server" : "Browser"}</Pill>
                    <span className="min-w-[12rem] flex-1 break-words font-medium">{g.message}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      ×{g.count} · {when(g.last_seen)}
                    </span>
                  </summary>
                  <div className="grid gap-1 border-t px-4 py-3 text-xs text-muted-foreground">
                    <p>
                      First {when(g.first_seen)} · last {when(g.last_seen)} · on {g.paths} {g.paths === 1 ? "page" : "pages"}
                    </p>
                    {g.last_path ? <p className="break-words">Last at: {g.last_path}</p> : null}
                    {g.last_detail ? (
                      <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono text-foreground">{g.last_detail}</pre>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Admin activity" description="Everything admins did, newest first (latest 50).">
        {audit.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul aria-label="Admin activity" className="divide-y rounded-lg border text-sm">
            {audit.data.map((a, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="break-words">
                    {auditText(a)}
                    {a.user_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/users/${a.user_id}`} className="text-primary hover:underline">
                          {a.email ?? "deleted account"}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[a.admin ? `by ${a.admin}` : null, typeof a.detail.note === "string" ? a.detail.note : null, typeof a.detail.reason === "string" ? a.detail.reason : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{when(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
