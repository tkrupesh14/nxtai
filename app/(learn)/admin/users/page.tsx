import Link from "next/link"

import { AdminHeading, AdminSection, Pill, when } from "@/components/admin/ui"
import { GrantForm } from "@/components/learn/admin-forms"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { getUserList, requireAdmin, USERS_PER_PAGE, type UserFilters } from "@/lib/admin/data"

export const metadata = { title: "Users — Admin — Krpex" }

type Params = { q?: string; plan?: string; active?: string; sort?: string; page?: string }

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)
const select = "h-9 rounded-md border bg-background px-2 text-sm"

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const f: UserFilters = {
    search: (p.q ?? "").slice(0, 100),
    plan: pick(p.plan, ["all", "free", "pro"] as const, "all"),
    active: pick(p.active, ["all", "7d", "30d", "quiet"] as const, "all"),
    sort: pick(p.sort, ["joined", "seen"] as const, "joined"),
    page: Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1)),
  }
  const { data, error } = await getUserList(f)
  const pages = Math.max(1, Math.ceil(data.total / USERS_PER_PAGE))
  const href = (page: number) => {
    const qs = new URLSearchParams()
    if (f.search) qs.set("q", f.search)
    if (f.plan !== "all") qs.set("plan", f.plan)
    if (f.active !== "all") qs.set("active", f.active)
    if (f.sort !== "joined") qs.set("sort", f.sort)
    if (page > 1) qs.set("page", String(page))
    const s = qs.toString()
    return `/admin/users${s ? `?${s}` : ""}`
  }
  const filtered = f.search || f.plan !== "all" || f.active !== "all" || f.sort !== "joined"
  const first = (f.page - 1) * USERS_PER_PAGE

  return (
    <>
      <AdminHeading title="Users" note="Open a learner to see everything about them." errors={[error]} />

      <AdminSection title={`${data.total} ${data.total === 1 ? "learner" : "learners"}${filtered ? " match" : ""}`}>
        <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users">
          <Input name="q" defaultValue={f.search} placeholder="Email, name or @handle" aria-label="Search email, name or handle" className="h-9 w-full sm:w-60" />
          <select name="plan" defaultValue={f.plan} aria-label="Plan" className={select}>
            <option value="all">Any plan</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
          <select name="active" defaultValue={f.active} aria-label="Activity" className={select}>
            <option value="all">Any activity</option>
            <option value="7d">Signed in last 7 days</option>
            <option value="30d">Signed in last 30 days</option>
            <option value="quiet">Quiet 30+ days</option>
          </select>
          <select name="sort" defaultValue={f.sort} aria-label="Sort" className={select}>
            <option value="joined">Newest first</option>
            <option value="seen">Last signed in</option>
          </select>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            Show
          </Button>
          {filtered ? (
            <Button asChild variant="ghost" size="sm" className="h-9">
              <Link href="/admin/users">Clear</Link>
            </Button>
          ) : null}
        </form>

        {data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users match.</p>
        ) : (
          <ul className="divide-y rounded-lg border" aria-label="Users">
            {data.rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="grid gap-1 px-4 py-3 text-sm hover:bg-muted/50 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium">{u.email}</span>
                      {u.plan === "pro" ? <Pill tone="primary">Pro</Pill> : null}
                      {u.banned ? <Pill tone="danger">Can&apos;t post</Pill> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[u.full_name, u.handle ? `@${u.handle}` : null].filter(Boolean).join(" · ") || "No name"} · joined {when(u.created_at)} · last sign-in{" "}
                      {when(u.last_sign_in_at)}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground md:text-right">
                    L{u.level} · {u.courses} {u.courses === 1 ? "course" : "courses"} · {u.solved} solved · {u.credits} credits
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-3 flex items-center justify-between text-sm">
            {f.page > 1 ? (
              <Link href={href(f.page - 1)} className="text-primary hover:underline">
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground tabular-nums">
              {first + 1}–{Math.min(first + USERS_PER_PAGE, data.total)} of {data.total}
            </span>
            {f.page < pages ? (
              <Link href={href(f.page + 1)} className="text-primary hover:underline">
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </AdminSection>

      <AdminSection title="Give credits or Pro" description="Applied immediately. Use negative credits to take credits away. You can also do this from a learner's page.">
        <GrantForm />
      </AdminSection>
    </>
  )
}
