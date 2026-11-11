import { AdminNav } from "@/components/admin/admin-nav"
import { getErrors, requireAdmin } from "@/lib/admin/data"

export const dynamic = "force-dynamic"

// Admin (plan.md Phase 6): one route per section, each loading only its own data. Admins only; everyone else gets a 404.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  const errors = await getErrors()
  const outages = errors.data.filter((e) => e.message.startsWith("AI outage"))
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-10">
      {outages.map((e) => (
        <div key={e.message} role="alert" className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-semibold">{e.message}</p>
          <p className="mt-0.5 text-muted-foreground">
            Learners can&apos;t use AI features. Last seen {new Date(e.last_seen).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            {e.last_detail ? ` · ${e.last_detail.slice(0, 200)}` : ""}
          </p>
        </div>
      ))}
      <div className="grid gap-6 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8">
        <div className="grid content-start gap-3">
          <p className="hidden px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:block">Admin</p>
          <AdminNav />
        </div>
        <div className="grid min-w-0 content-start gap-6">{children}</div>
      </div>
    </main>
  )
}
