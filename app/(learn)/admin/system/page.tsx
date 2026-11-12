import Link from "next/link"

import { AdminHeading, AdminSection, auditText, when } from "@/components/admin/ui"
import { getAudit, getErrors, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "System — Admin — Krpex" }

export default async function AdminSystem() {
  await requireAdmin()
  const [errors, audit] = await Promise.all([getErrors(), getAudit(50)])
  const total = errors.data.reduce((n, e) => n + Number(e.count), 0)
  return (
    <>
      <AdminHeading title="System" errors={[errors.error, audit.error]} />
      <AdminSection title={`Errors, last 24 hours (${total})`} description="Server crashes and browser errors, grouped by message.">
        {errors.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors. 🎉</p>
        ) : (
          <ul className="grid gap-2">
            {errors.data.map((e, i) => (
              <li key={i} className="rounded-lg border text-sm">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{e.source}</span>
                    <span className="min-w-0 flex-1 break-words font-medium">{e.message}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ×{e.count} · {when(e.last_seen)}
                    </span>
                  </summary>
                  <div className="border-t px-4 py-3 text-xs">
                    {e.last_path ? <p className="text-muted-foreground">Last at: {e.last_path}</p> : null}
                    {e.last_detail ? (
                      <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono">{e.last_detail}</pre>
                    ) : null}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Admin activity" description="Credits and Pro given, bans, hidden profiles and moderation, newest first (latest 50).">
        {audit.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul aria-label="Admin activity" className="divide-y rounded-lg border text-sm">
            {audit.data.map((e, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="break-words">
                    {auditText(e)}
                    {e.user_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/users/${e.user_id}`} className="text-primary hover:underline">
                          {e.email ?? "deleted account"}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[e.admin ? `by ${e.admin}` : null, typeof e.detail.note === "string" ? e.detail.note : null, typeof e.detail.reason === "string" ? e.detail.reason : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{when(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
