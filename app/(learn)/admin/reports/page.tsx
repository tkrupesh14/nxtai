import { AdminHeading, AdminSection, when } from "@/components/admin/ui"
import { ResolveButton } from "@/components/learn/admin-forms"
import { getReports, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "Lesson reports — Admin — Krpex" }

export default async function AdminReports() {
  await requireAdmin()
  const reports = await getReports()
  return (
    <>
      <AdminHeading title="Lesson reports" note="Problems learners reported in their lessons." errors={[reports.error]} />
      <AdminSection title={`Open (${reports.data.length})`}>
        {reports.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open reports.</p>
        ) : (
          <ul className="grid gap-3">
            {reports.data.map((r) => (
              <li key={r.id} className="rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.reason}</span> {r.lesson_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.course_title} · {r.email} · {when(r.created_at)}
                    </p>
                  </div>
                  <ResolveButton id={r.id} />
                </div>
                {r.details ? <p className="mt-2 text-pretty">{r.details}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
