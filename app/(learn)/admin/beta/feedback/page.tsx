import Link from "next/link"
import { headers } from "next/headers"

import { BetaTabs } from "@/components/admin/beta-tabs"
import { AdminHeading, AdminSection, Pill, Tile, when } from "@/components/admin/ui"
import { FeedbackTriageForm } from "@/components/learn/admin-feedback"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { FEEDBACK_PER_PAGE, getFeedbackList, requireAdmin, type FeedbackFilter } from "@/lib/admin/data"
import { requestHost } from "@/lib/code-host"
import { FEEDBACK_BUCKET, FEEDBACK_KINDS, FEEDBACK_SITES, FEEDBACK_STATUSES, feedbackPageHref, kindLabel, siteLabel, statusLabel } from "@/lib/feedback/options"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Feedback — Beta — Admin — Krpex" }

type Params = { show?: string; site?: string; kind?: string; q?: string; page?: string }

const SHOW: { id: FeedbackFilter; label: string }[] = [{ id: "open", label: "Open" }, ...FEEDBACK_STATUSES, { id: "all", label: "All" }]
const TONE = { new: "warn", planned: "primary", in_progress: "primary", fixed: "muted", wont_fix: "muted" } as const
const KIND_TONE = { bug: "danger", confusing: "warn", suggestion: "primary" } as const
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`
const select = "h-9 rounded-md border bg-background px-2 text-sm"

export default async function AdminFeedback({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const show: FeedbackFilter = SHOW.some((s) => s.id === p.show) ? (p.show as FeedbackFilter) : "open"
  const site = FEEDBACK_SITES.some((s) => s.id === p.site) ? p.site! : ""
  const kind = FEEDBACK_KINDS.some((k) => k.id === p.kind) ? p.kind! : ""
  const q = (p.q ?? "").slice(0, 100)
  const page = Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1))
  const [{ data, error }, host] = await Promise.all([getFeedbackList(show, site, kind, q, page), headers().then(requestHost)])
  const href = (o: { show?: FeedbackFilter; page?: number }) => {
    const qs = new URLSearchParams()
    const s = o.show ?? show
    if (s !== "open") qs.set("show", s)
    if (site) qs.set("site", site)
    if (kind) qs.set("kind", kind)
    if (q) qs.set("q", q)
    if ((o.page ?? 1) > 1) qs.set("page", String(o.page))
    const str = qs.toString()
    return `/admin/beta/feedback${str ? `?${str}` : ""}`
  }
  const counts = data?.counts ?? { new: 0, planned: 0, in_progress: 0, fixed: 0, wont_fix: 0 }
  const countOf = (id: FeedbackFilter) =>
    id === "open" ? counts.new + counts.planned + counts.in_progress : id === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[id]
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / FEEDBACK_PER_PAGE))

  // Screenshots are private: signed links for 10 minutes, made with the admin's own sign-in.
  const paths = (data?.rows ?? []).flatMap((r) => (r.screenshot ? [r.screenshot] : []))
  const shots = new Map<string, string>()
  if (paths.length) {
    const supabase = await createClient()
    const { data: signed, error: e } = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrls(paths, 600)
    if (e) console.error("feedback screenshots failed:", e.message)
    for (const s of signed ?? []) if (s.path && s.signedUrl) shots.set(s.path, s.signedUrl)
  }

  return (
    <>
      <AdminHeading
        title="Beta"
        note="Bugs, ideas and confusing bits from the Feedback button on krpex.in, Krpex Code and Krpex Community. A reply, or marking a report fixed, notifies the tester."
        errors={[error]}
      />
      <BetaTabs current="feedback" newFeedback={counts.new} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="New" value={counts.new.toLocaleString("en-IN")} />
        <Tile label="Planned or in progress" value={(counts.planned + counts.in_progress).toLocaleString("en-IN")} />
        <Tile label="Fixed" value={counts.fixed.toLocaleString("en-IN")} />
        <Tile label="Won't fix" value={counts.wont_fix.toLocaleString("en-IN")} />
      </div>

      <AdminSection title={`${SHOW.find((s) => s.id === show)!.label} (${(data?.total ?? 0).toLocaleString("en-IN")})`}>
        <nav aria-label="Status" className="mb-4 flex flex-wrap gap-2 text-sm">
          {SHOW.map((s) => (
            <Link key={s.id} href={href({ show: s.id })} aria-current={s.id === show ? "page" : undefined} className={tabClass(s.id === show)}>
              {s.label} {countOf(s.id) ? `· ${countOf(s.id)}` : ""}
            </Link>
          ))}
        </nav>
        <form action="/admin/beta/feedback" className="mb-4 flex flex-wrap items-center gap-2">
          {show !== "open" ? <input type="hidden" name="show" value={show} /> : null}
          <select name="site" defaultValue={site} aria-label="Site" className={select}>
            <option value="">All sites</option>
            {FEEDBACK_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="kind" defaultValue={kind} aria-label="Kind" className={select}>
            <option value="">All kinds</option>
            {FEEDBACK_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {kindLabel(k.id)}
              </option>
            ))}
          </select>
          <Input name="q" defaultValue={q} placeholder="Words, page or email" aria-label="Search feedback" className="h-9 w-full sm:w-60" />
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Filter
          </Button>
          {q || site || kind ? (
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href={show === "open" ? "/admin/beta/feedback" : `/admin/beta/feedback?show=${show}`}>Clear</Link>
            </Button>
          ) : null}
        </form>

        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{show === "open" && !q && !site && !kind ? "Nothing open. Inbox zero!" : "Nothing here."}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Feedback">
            {data.rows.map((r) => {
              const shot = r.screenshot ? shots.get(r.screenshot) : undefined
              const c = r.context ?? {}
              return (
                <li key={r.id} className="grid gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <Pill tone={KIND_TONE[r.kind]}>{kindLabel(r.kind)}</Pill>
                      <Pill tone={TONE[r.status]}>{statusLabel(r.status)}</Pill>
                      <Link href={`/admin/users/${r.user_id}`} className="font-medium hover:underline">
                        {r.name ?? r.email}
                      </Link>
                      {r.name ? <span className="break-all text-muted-foreground">{r.email}</span> : null}
                    </p>
                    <span className="text-xs tabular-nums text-muted-foreground">{when(r.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {siteLabel(r.site)}{" "}
                    <a href={feedbackPageHref(r.site, r.path, host)} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                      {r.path}
                    </a>
                  </p>
                  <p className="whitespace-pre-line break-words">{r.body}</p>
                  {r.screenshot ? (
                    shot ? (
                      <a href={shot} target="_blank" rel="noreferrer" className="justify-self-start" aria-label="Open the screenshot">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot} alt="Screenshot from the tester" className="h-28 max-w-64 rounded border object-cover object-top" />
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">Screenshot attached, but it couldn&apos;t be loaded.</p>
                    )
                  ) : null}
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      Details{c.errors?.length ? ` · ${c.errors.length} browser error${c.errors.length === 1 ? "" : "s"}` : ""}
                    </summary>
                    <dl className="mt-2 grid gap-1 sm:grid-cols-[7rem_1fr]">
                      <dt>Browser</dt>
                      <dd className="break-all">{c.browser ?? "—"}</dd>
                      <dt>Screen</dt>
                      <dd>
                        {c.screen ?? "—"}
                        {c.viewport ? ` (window ${c.viewport})` : ""}
                        {c.language ? ` · ${c.language}` : ""}
                      </dd>
                      <dt>Build</dt>
                      <dd className="font-mono">{c.commit ?? "—"}</dd>
                      {c.errors?.length ? (
                        <>
                          <dt>Errors</dt>
                          <dd>
                            <ul className="grid gap-1 font-mono">
                              {c.errors.map((e, i) => (
                                <li key={i} className="break-words">
                                  {e.message}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </details>
                  {r.replied_at ? (
                    <p className="text-xs text-muted-foreground">
                      Replied {when(r.replied_at)}
                      {r.replied_by ? ` by ${r.replied_by}` : ""}
                    </p>
                  ) : null}
                  <FeedbackTriageForm id={r.id} status={r.status} reply={r.reply} />
                </li>
              )
            })}
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
