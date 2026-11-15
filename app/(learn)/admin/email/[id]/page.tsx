import Link from "next/link"
import { notFound } from "next/navigation"

import { CampaignControl, CampaignEditor, TestSendButton } from "@/components/admin/email-forms"
import { EMAIL_STATUS, n, pct } from "@/components/admin/email-ui"
import { AdminHeading, AdminSection, Pill, th, td, Tile, when } from "@/components/admin/ui"
import { EMAIL_PER_PAGE, getEmailCampaign, requireAdmin } from "@/lib/admin/data"
import { renderCampaign } from "@/lib/email/campaign"

export const metadata = { title: "Campaign — Email — Admin — Krpex" }

const FILTERS = [
  { id: "all", label: "Everyone" },
  { id: "queued", label: "Waiting" },
  { id: "opened", label: "Opened" },
  { id: "not_opened", label: "Not opened" },
  { id: "clicked", label: "Clicked" },
  { id: "signed_up", label: "Signed up" },
  { id: "applied", label: "Applied" },
  { id: "unsubscribed", label: "Unsubscribed" },
  { id: "bounced", label: "Bounced" },
  { id: "complained", label: "Spam" },
  { id: "failed", label: "Not sent" },
] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATE: Record<string, string> = { queued: "Waiting", sending: "Sending", sent: "Sent", failed: "Failed", skipped: "Not sent", bounced: "Bounced", complained: "Spam" }
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`

export default async function AdminEmailCampaign({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string; page?: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const p = await searchParams
  const show = FILTERS.some((f) => f.id === p.show) ? p.show! : "all"
  const page = Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1))
  const { data, error } = await getEmailCampaign(id, show, page)
  if (!data && !error) notFound()
  if (!data) return <AdminHeading title="Campaign" errors={[error]} />

  const c = data.campaign
  const s = data.stats
  const preview = renderCampaign(c, { name: "Asha Rao", token: null })
  const pages = Math.max(1, Math.ceil(data.total / EMAIL_PER_PAGE))
  const href = (o: { show?: string; page?: number }) => {
    const qs = new URLSearchParams()
    const f = o.show ?? show
    if (f !== "all") qs.set("show", f)
    if ((o.page ?? 1) > 1) qs.set("page", String(o.page))
    return `/admin/email/${id}${qs.size ? `?${qs}` : ""}`
  }

  return (
    <>
      <AdminHeading title={c.name} note={c.subject ? `Subject: ${c.subject}` : undefined} errors={[error]} />
      <p className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/admin/email" className="text-primary hover:underline">
          ← Email
        </Link>
        <Pill tone={EMAIL_STATUS[c.status].tone}>{EMAIL_STATUS[c.status].label}</Pill>
        <span className="text-muted-foreground">
          {c.tags.length ? `To tags: ${c.tags.join(", ")}` : "To every contact"} · links carry ?ref=email-{c.slug}
        </span>
      </p>

      {c.status === "draft" ? (
        <>
          <AdminSection title="Write it">
            <CampaignEditor id={id} draft={c} />
          </AdminSection>
          <AdminSection
            title="Check and send"
            description={`${n(data.audience)} contacts will get it (people on the do-not-send list are left out). It goes out in batches: today's limit is ${n(data.today.cap)} (${n(data.today.sent)} sent so far), rising while bounces and spam complaints stay low. Sending pauses itself if bounces pass 5% or complaints pass 0.1%.`}
          >
            <div className="flex flex-wrap items-start gap-4">
              <TestSendButton id={id} />
              <CampaignControl id={id} action="start" variant="default" />
            </div>
          </AdminSection>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Sent" value={n(s.sent)} sub={s.queued ? `${n(s.queued)} waiting · today ${n(data.today.sent)} / ${n(data.today.cap)}` : `of ${n(s.recipients)}`} />
            <Tile label="Delivered" value={pct(s.delivered, s.sent)} sub={`${n(s.delivered)} confirmed by SES`} />
            <Tile label="Opened" value={pct(s.opened, s.sent)} sub={`${n(s.opened)} · approximate`} />
            <Tile label="Clicked" value={pct(s.clicked, s.sent)} sub={n(s.clicked)} />
            <Tile label="Created an account" value={n(s.signed_up)} sub="after the email" />
            <Tile label="Applied to the beta" value={n(s.applied)} sub="after the email" />
            <Tile label="Bounced" value={pct(s.bounced, s.sent)} sub={`${n(s.bounced)} · keep under 5%`} />
            <Tile label="Unsubscribed · spam" value={`${n(s.unsubscribed)} · ${n(s.complained)}`} sub="spam: keep under 0.1%" />
          </div>
          {c.paused_reason ? (
            <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
              {c.paused_reason}
            </p>
          ) : null}
          {c.status !== "done" ? (
            <div className="flex flex-wrap gap-3">
              {c.status === "sending" ? <CampaignControl id={id} action="pause" /> : <CampaignControl id={id} action="resume" variant="default" />}
              <CampaignControl id={id} action="stop" variant="destructive" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Finished {when(c.finished_at)}.</p>
          )}

          <AdminSection title={`People (${n(data.total)})`}>
            <nav aria-label="Filter" className="mb-4 flex flex-wrap gap-2 text-sm">
              {FILTERS.map((f) => (
                <Link key={f.id} href={href({ show: f.id })} aria-current={f.id === show ? "page" : undefined} className={tabClass(f.id === show)}>
                  {f.label}
                </Link>
              ))}
            </nav>
            {!data.rows.length ? (
              <p className="text-sm text-muted-foreground">Nobody here.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className={th}>Email</th>
                      <th className={th}>Status</th>
                      <th className={th}>Sent</th>
                      <th className={th}>Opened</th>
                      <th className={th}>Clicked</th>
                      <th className={th}>After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.rows.map((r) => (
                      <tr key={r.email}>
                        <td className={td}>
                          {r.email}
                          {r.name ? <span className="text-muted-foreground"> · {r.name}</span> : null}
                        </td>
                        <td className={td} title={r.error ?? undefined}>
                          {STATE[r.status] ?? r.status}
                          {r.delivered_at && r.status === "sent" ? " · delivered" : ""}
                          {r.unsubscribed_at ? " · unsubscribed" : ""}
                        </td>
                        <td className={td}>{when(r.sent_at)}</td>
                        <td className={td}>{r.opened_at ? `${when(r.opened_at)}${r.opens > 1 ? ` (${r.opens}×)` : ""}` : "—"}</td>
                        <td className={td}>{r.clicked_at ? `${when(r.clicked_at)}${r.clicks > 1 ? ` (${r.clicks}×)` : ""}` : "—"}</td>
                        <td className={td}>{r.applied ? "Applied to the beta" : r.signed_up ? "Created an account" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pages > 1 ? (
              <nav aria-label="Pages" className="mt-4 flex justify-between text-sm">
                {page > 1 ? <Link href={href({ page: page - 1 })} className="text-primary hover:underline">← Previous</Link> : <span />}
                <span className="text-muted-foreground">
                  Page {page} of {pages}
                </span>
                {page < pages ? <Link href={href({ page: page + 1 })} className="text-primary hover:underline">Next →</Link> : <span />}
              </nav>
            ) : null}
          </AdminSection>
        </>
      )}

      <AdminSection title="Preview" description={`From “${c.from_name}” <hello@news.krpex.in> · “${preview.subject || "(no subject)"}” · shown with a sample name.`}>
        <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[640px] w-full rounded-lg border bg-white" />
      </AdminSection>
    </>
  )
}
