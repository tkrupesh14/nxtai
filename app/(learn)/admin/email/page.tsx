import Link from "next/link"

import { ImportContactsForm } from "@/components/admin/email-forms"
import { AdminHeading, AdminSection, Pill, th, td, Tile, when } from "@/components/admin/ui"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { EMAIL_STATUS as STATUS, n, pct } from "@/components/admin/email-ui"
import { getEmailOverview, requireAdmin } from "@/lib/admin/data"
import { SKIP_LABELS, type SkipReason } from "@/lib/email/contacts-csv"

import { createCampaignAction } from "./actions"

export const metadata = { title: "Email — Admin — Krpex" }


export default async function AdminEmail() {
  await requireAdmin()
  const { data, error } = await getEmailOverview()
  const suppressed = data?.suppressed ?? {}
  const offList = Object.values(suppressed).reduce((a, b) => a + b, 0)

  return (
    <>
      <AdminHeading
        title="Email"
        note="Announcements to people from our own community, sent through Amazon SES from news.krpex.in in a slow daily ramp. Opens are approximate; clicks, sign-ups and beta applications are what count."
        errors={[error]}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Contacts" value={n(data?.contacts)} sub="imported from our community" />
        <Tile label="Can be emailed" value={n(data?.sendable)} />
        <Tile label="Sent today" value={`${n(data?.today.sent)} / ${n(data?.today.cap)}`} sub="daily limit, rising as the ramp goes well" />
        <Tile
          label="Do-not-send list"
          value={n(offList)}
          sub={offList ? `${n(suppressed.unsubscribed)} unsubscribed · ${n(suppressed.bounced)} bounced · ${n(suppressed.complained)} spam` : "unsubscribes, bounces, complaints"}
        />
      </div>

      <p className="text-sm">
        <Link href="/admin/email/contacts" className="text-primary hover:underline">
          See all contacts →
        </Link>
      </p>

      <AdminSection title="Campaigns">
        <form action={createCampaignAction} className="mb-4 flex flex-wrap items-center gap-2">
          <Input name="name" required maxLength={120} placeholder="New campaign, e.g. Beta invite for 30 Days of Code" aria-label="New campaign name" className="h-9 w-full sm:w-96" />
          <Button type="submit" size="sm" className="h-9">
            Create
          </Button>
        </form>
        {!data?.campaigns.length ? (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Campaign</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Sent</th>
                  <th className={`${th} text-right`}>Opened</th>
                  <th className={`${th} text-right`}>Clicked</th>
                  <th className={`${th} text-right`}>Signed up</th>
                  <th className={`${th} text-right`}>Applied</th>
                  <th className={`${th} text-right`}>Bounced</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <Link href={`/admin/email/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.started_at ? `started ${when(c.started_at)}` : `created ${when(c.created_at)}`}</p>
                    </td>
                    <td className={td}>
                      <Pill tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Pill>
                    </td>
                    <td className={`${td} text-right`}>
                      {n(c.stats.sent)}
                      {c.stats.queued ? <span className="text-xs text-muted-foreground"> +{n(c.stats.queued)} waiting</span> : null}
                    </td>
                    <td className={`${td} text-right`}>{pct(c.stats.opened, c.stats.sent)}</td>
                    <td className={`${td} text-right`}>{pct(c.stats.clicked, c.stats.sent)}</td>
                    <td className={`${td} text-right`}>{n(c.stats.signed_up)}</td>
                    <td className={`${td} text-right`}>{n(c.stats.applied)}</td>
                    <td className={`${td} text-right`}>{pct(c.stats.bounced, c.stats.sent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Import contacts"
        description="Only people who signed up with us (our events, forms, community). Bad addresses, duplicates, shared inboxes and domains that can't receive mail are dropped before anything is saved."
      >
        <ImportContactsForm />
      </AdminSection>

      <AdminSection title="Lists">
        {!data?.tags.length ? (
          <p className="text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {data.tags.map((t) => (
              <li key={t.tag}>
                <Link href={`/admin/email/contacts?tag=${encodeURIComponent(t.tag)}`} className="rounded-full border px-3 py-1 hover:border-primary">
                  {t.tag} · {n(t.contacts)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data?.imports.length ? (
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Imported</th>
                  <th className={th}>Source</th>
                  <th className={th}>Kept</th>
                  <th className={th}>Skipped</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.imports.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>{when(i.created_at)}</td>
                    <td className="px-3 py-2">
                      {i.source}
                      <p className="text-xs text-muted-foreground">
                        {i.file_name ?? ""}
                        {i.tags.length ? ` · ${i.tags.join(", ")}` : ""}
                        {i.consent_note ? ` · ${i.consent_note}` : ""}
                      </p>
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {n(i.counts.added)} new, {n(i.counts.updated)} existing
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {Object.entries(i.counts)
                        .filter(([k, v]) => k in SKIP_LABELS && v)
                        .map(([k, v]) => `${v} ${SKIP_LABELS[k as SkipReason]}`)
                        .join(" · ") || "none"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminSection>
    </>
  )
}
