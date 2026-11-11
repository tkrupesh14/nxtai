import { AdminHeading, AdminSection, when } from "@/components/admin/ui"
import { getErrors, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "System — Admin — Krpex" }

export default async function AdminSystem() {
  await requireAdmin()
  const errors = await getErrors()
  const total = errors.data.reduce((n, e) => n + Number(e.count), 0)
  return (
    <>
      <AdminHeading title="System" errors={[errors.error]} />
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
    </>
  )
}
