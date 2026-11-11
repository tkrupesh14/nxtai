import Link from "next/link"

import { AdminHeading, AdminSection, td, th, when } from "@/components/admin/ui"
import { GrantForm } from "@/components/learn/admin-forms"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { getUsers, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "Users — Admin — Krpex" }

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin()
  const { q = "" } = await searchParams
  const users = await getUsers(q)
  return (
    <>
      <AdminHeading title="Users" note="Newest first, up to 50. Search by email or name." errors={[users.error]} />

      <AdminSection title="Find a learner">
        <form className="mb-3 flex flex-wrap gap-2" action="/admin/users">
          <Input name="q" defaultValue={q} placeholder="Search email or name" aria-label="Search email or name" className="max-w-xs" />
          <Button type="submit" variant="outline">
            Search
          </Button>
          {q ? (
            <Button asChild variant="ghost">
              <Link href="/admin/users">Clear</Link>
            </Button>
          ) : null}
        </form>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Email", "Name", "Plan", "Credits", "Courses", "Questions 7d", "Joined", "Last sign-in"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className={td}>{u.email}</td>
                  <td className={td}>{u.full_name ?? "—"}</td>
                  <td className={td}>{u.plan === "pro" ? <span className="font-medium text-primary">Pro</span> : "Free"}</td>
                  <td className={`${td} tabular-nums`}>{u.credits}</td>
                  <td className={`${td} tabular-nums`}>{u.courses}</td>
                  <td className={`${td} tabular-nums`}>{u.questions_7d}</td>
                  <td className={td}>{when(u.created_at)}</td>
                  <td className={td}>{when(u.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.data.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No users match.</p> : null}
      </AdminSection>

      <AdminSection title="Give credits or Pro" description="Applied immediately. Use negative credits to take credits away.">
        <GrantForm />
      </AdminSection>
    </>
  )
}
