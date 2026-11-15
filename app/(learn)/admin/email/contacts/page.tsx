import Link from "next/link"

import { n } from "@/components/admin/email-ui"
import { AdminHeading, AdminSection, Pill, th, td, when } from "@/components/admin/ui"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { EMAIL_PER_PAGE, getEmailContacts, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "Email contacts — Admin — Krpex" }

const OFF = { unsubscribed: "Unsubscribed", bounced: "Bounced", complained: "Marked as spam", manual: "Removed" } as Record<string, string>

export default async function AdminEmailContacts({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; page?: string }> }) {
  await requireAdmin()
  const p = await searchParams
  const q = (p.q ?? "").slice(0, 100)
  const tag = (p.tag ?? "").slice(0, 30)
  const page = Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1))
  const { data, error } = await getEmailContacts(q, tag, page)
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / EMAIL_PER_PAGE))
  const href = (pg: number) => {
    const qs = new URLSearchParams()
    if (q) qs.set("q", q)
    if (tag) qs.set("tag", tag)
    if (pg > 1) qs.set("page", String(pg))
    return `/admin/email/contacts${qs.size ? `?${qs}` : ""}`
  }

  return (
    <>
      <AdminHeading title="Email contacts" errors={[error]} />
      <p className="text-sm">
        <Link href="/admin/email" className="text-primary hover:underline">
          ← Email
        </Link>
      </p>
      <AdminSection title={`${tag ? `Tag “${tag}”` : "Everyone"} (${n(data?.total)})`}>
        <form action="/admin/email/contacts" className="mb-4 flex flex-wrap items-center gap-2">
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          <Input name="q" defaultValue={q} placeholder="Email, name or college" aria-label="Search contacts" className="h-9 w-full sm:w-72" />
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Search
          </Button>
          {q || tag ? (
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href="/admin/email/contacts">Clear</Link>
            </Button>
          ) : null}
        </form>
        {!data?.rows.length ? (
          <p className="text-sm text-muted-foreground">Nobody here.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className={th}>Email</th>
                  <th className={th}>Name</th>
                  <th className={th}>College · year</th>
                  <th className={th}>Tags</th>
                  <th className={th}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.rows.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      {c.email} {c.suppressed ? <Pill tone="warn">{OFF[c.suppressed] ?? c.suppressed}</Pill> : null}
                    </td>
                    <td className={td}>{c.name ?? "—"}</td>
                    <td className="px-3 py-2">{[c.college, c.year].filter(Boolean).join(" · ") || "—"}</td>
                    <td className={td}>{c.tags.join(", ") || "—"}</td>
                    <td className={td}>{when(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-4 flex justify-between text-sm">
            {page > 1 ? <Link href={href(page - 1)} className="text-primary hover:underline">← Previous</Link> : <span />}
            <span className="text-muted-foreground">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={href(page + 1)} className="text-primary hover:underline">Next →</Link> : <span />}
          </nav>
        ) : null}
      </AdminSection>
    </>
  )
}
