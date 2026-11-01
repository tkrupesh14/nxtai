import Link from "next/link"
import { notFound } from "next/navigation"

import { GrantForm, ResolveButton } from "@/components/learn/admin-forms"
import { AccountSection } from "@/components/learn/account-section"
import { Input } from "@/components/site/ui/input"
import { Button } from "@/components/site/ui/button"
import { PRODUCTS, type ProductId } from "@/lib/learning/plans"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Admin — Krpex" }
export const dynamic = "force-dynamic"

type Overview = Record<string, number>
type Day = { day: string; signups: number; courses: number; lessons: number; questions: number; ai_usd: string; revenue_paise: number }
type UserRow = {
  id: string
  email: string
  full_name: string | null
  created_at: string
  last_sign_in_at: string | null
  plan: string
  credits: number
  courses: number
  questions_7d: number
}
type Payment = { created_at: string; paid_at: string | null; email: string; product: string; amount_paise: number; status: string; razorpay_payment_id: string | null }
type ErrorGroup = { source: string; message: string; count: number; last_seen: string; last_path: string | null; last_detail: string | null }
type Report = { id: string; created_at: string; email: string; course_id: string; course_title: string; lesson_title: string; reason: string; details: string | null }

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
const usd = (v: number | string) => `$${Number(v).toFixed(Number(v) < 1 ? 3 : 2)}`
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—"

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

const th = "px-3 py-2 text-left font-medium whitespace-nowrap"
const td = "px-3 py-2 whitespace-nowrap"

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) notFound()
  const { q = "" } = await searchParams

  const [overview, daily, users, payments, reports, errors] = await Promise.all([
    supabase.rpc("admin_overview"),
    supabase.rpc("admin_daily", { p_days: 14 }),
    supabase.rpc("admin_users", { p_search: q.slice(0, 100), p_limit: 50 }),
    supabase.rpc("admin_payments", { p_limit: 20 }),
    supabase.rpc("admin_reports", { p_status: "open" }),
    supabase.rpc("admin_errors", { p_hours: 24 }),
  ])
  const o = (overview.data ?? {}) as Overview
  const days = (daily.data ?? []) as Day[]
  const userRows = (users.data ?? []) as UserRow[]
  const paymentRows = (payments.data ?? []) as Payment[]
  const reportRows = (reports.data ?? []) as Report[]
  const errorRows = (errors.data ?? []) as ErrorGroup[]
  const failed = [overview, daily, users, payments, reports, errors].find((r) => r.error)

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Days are India time. AI cost uses GPT-6 Luna prices.</p>
      {failed?.error ? (
        <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
          Some data couldn&apos;t load: {failed.error.message}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Users" value={o.users_total ?? 0} sub={`+${o.users_today ?? 0} today · ${o.active_7d ?? 0} active 7d`} />
        <Tile label="Courses" value={o.courses_total ?? 0} sub={`+${o.courses_today ?? 0} today`} />
        <Tile label="Today" value={o.lessons_written_today ?? 0} sub={`lessons written · ${o.questions_today ?? 0} questions`} />
        <Tile label="AI spend today" value={usd(o.ai_usd_today ?? 0)} sub={`${usd(o.ai_usd_30d ?? 0)} last 30 days`} />
        <Tile label="Revenue (30 days)" value={inr(o.revenue_paise_30d ?? 0)} sub={`${inr(o.revenue_paise_total ?? 0)} all time`} />
        <Tile label="Paid orders" value={o.paid_orders_total ?? 0} sub={`${o.pro_active ?? 0} active Pro`} />
        <Tile label="Credits held" value={o.credits_outstanding ?? 0} sub="across all learners" />
        <Tile label="Open reports" value={o.reports_open ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 [&>*]:min-w-0">
        <AccountSection title="Last 14 days">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-muted/50">
                <tr>
                  {["Day", "Sign-ups", "Courses", "Lessons", "Questions", "AI cost", "Revenue"].map((h) => (
                    <th key={h} className={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} className="border-t">
                    <td className={td}>{new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</td>
                    <td className={td}>{d.signups}</td>
                    <td className={td}>{d.courses}</td>
                    <td className={td}>{d.lessons}</td>
                    <td className={td}>{d.questions}</td>
                    <td className={td}>{usd(d.ai_usd)}</td>
                    <td className={td}>{inr(d.revenue_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccountSection>

        <AccountSection title={`Problem reports (${reportRows.length} open)`}>
          {reportRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reports.</p>
          ) : (
            <ul className="grid gap-3">
              {reportRows.map((r) => (
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
        </AccountSection>

        <AccountSection
          title={`Errors, last 24 hours (${errorRows.reduce((n, e) => n + Number(e.count), 0)})`}
          description="Server crashes and browser errors, grouped by message."
        >
          {errorRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors. 🎉</p>
          ) : (
            <ul className="grid gap-2">
              {errorRows.map((e, i) => (
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
                        <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono">
                          {e.last_detail}
                        </pre>
                      ) : null}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </AccountSection>

        <AccountSection title="Give credits or Pro" description="Applied immediately. Use negative credits to take credits away.">
          <GrantForm />
        </AccountSection>

        <AccountSection title="Users" description="Newest first. Search by email or name.">
          <form className="mb-3 flex gap-2" action="/admin">
            <Input name="q" defaultValue={q} placeholder="Search email or name" className="max-w-xs" />
            <Button type="submit" variant="outline">
              Search
            </Button>
            {q ? (
              <Button asChild variant="ghost">
                <Link href="/admin">Clear</Link>
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
                {userRows.map((u) => (
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
          {userRows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No users match.</p> : null}
        </AccountSection>

        <AccountSection title="Recent payments">
          {paymentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["When", "Email", "Product", "Amount", "Status", "Payment ID"].map((h) => (
                      <th key={h} className={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className={td}>{when(p.paid_at ?? p.created_at)}</td>
                      <td className={td}>{p.email}</td>
                      <td className={td}>{PRODUCTS[p.product as ProductId]?.label ?? p.product}</td>
                      <td className={`${td} tabular-nums`}>{inr(p.amount_paise)}</td>
                      <td className={td}>{p.status === "paid" ? "Paid" : p.status === "created" ? "Not completed" : p.status}</td>
                      <td className={`${td} font-mono text-xs`}>{p.razorpay_payment_id ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AccountSection>
      </div>
    </main>
  )
}
