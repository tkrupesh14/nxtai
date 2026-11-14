import Link from "next/link"

import { AdminHeading, AdminSection, aiFeature, inr, Pill, rupees, td, th, Tile, when } from "@/components/admin/ui"
import { UsdInrForm } from "@/components/learn/admin-forms"
import { getMoney, getPaymentList, PAYMENTS_PER_PAGE, requireAdmin, type MoneyDays, type PaymentStatus } from "@/lib/admin/data"
import { PRODUCTS, type ProductId } from "@/lib/learning/plans"

export const metadata = { title: "Money — Admin — Krpex" }

type Params = { days?: string; status?: string; page?: string }

const RANGES: MoneyDays[] = [7, 30, 90]
const STATUSES: { id: PaymentStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "paid", label: "Paid" },
  { id: "created", label: "Not completed" },
  { id: "failed", label: "Failed" },
]
const CREDIT_REASONS: Record<string, string> = {
  purchase: "Bought",
  grant: "Given by an admin",
  question: "Professor questions",
  course: "New courses",
  coach: "Coding coach",
  refund: "Refunds",
  adjust: "Adjustments",
}
const n = (v: number | string) => Number(v).toLocaleString("en-IN")
const day = (iso: string) => new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Kolkata" })
const tabClass = (on: boolean) => `rounded-full border px-3 py-1 ${on ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`

function Table({ label, head, children }: { label: string; head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" aria-label={label}>
        <thead className="bg-muted/50">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`${th} ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
const num = `${td} text-right tabular-nums`

export default async function AdminMoney({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const days: MoneyDays = p.days === "7" ? 7 : p.days === "90" ? 90 : 30
  const status: PaymentStatus = p.status === "paid" || p.status === "created" || p.status === "failed" ? p.status : "all"
  const page = Math.max(1, Math.min(2000, Number.parseInt(p.page ?? "1", 10) || 1))
  const [money, payments] = await Promise.all([getMoney(days), getPaymentList(status, page)])
  const m = money.data
  const href = (o: { days?: MoneyDays; status?: PaymentStatus; page?: number }) => {
    const qs = new URLSearchParams()
    const d = o.days ?? days
    const s = o.status ?? status
    const pg = o.page ?? (o.status ? 1 : page)
    if (d !== 30) qs.set("days", String(d))
    if (s !== "all") qs.set("status", s)
    if (pg > 1) qs.set("page", String(pg))
    const q = qs.toString()
    return `/admin/money${q ? `?${q}` : ""}`
  }
  const pages = Math.max(1, Math.ceil(payments.data.total / PAYMENTS_PER_PAGE))
  const first = (page - 1) * PAYMENTS_PER_PAGE

  if (!m) return <AdminHeading title="Money" errors={[money.error ?? "No data", payments.error]} />
  const revenue = m.revenue_paise / 100
  const ai = Number(m.ai_inr)
  const featureTotal = m.features.reduce((s, f) => s + Number(f.inr), 0) || 1

  return (
    <>
      <AdminHeading title="Money" note={`All amounts in rupees. AI is billed in dollars and shown at $1 = ₹${m.rate.usd_inr}.`} errors={[money.error, payments.error]} />

      <nav aria-label="Period" className="flex flex-wrap gap-2 text-sm">
        {RANGES.map((r) => (
          <Link key={r} href={href({ days: r })} aria-current={r === days ? "page" : undefined} className={tabClass(r === days)}>
            Last {r} days
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tile label="Revenue" value={inr(m.revenue_paise)} sub={`${m.paid_orders} paid orders · ${m.paying_learners} learners`} />
        <Tile label="AI cost" value={rupees(ai)} sub={`${n(m.ai_calls)} calls`} />
        <Tile label="Revenue after AI" value={rupees(Math.round((revenue - ai) * 100) / 100)} sub={revenue > 0 ? `AI is ${Math.round((ai / revenue) * 100)}% of revenue` : "No revenue yet"} />
        <Tile label="Not completed" value={m.unpaid_orders} sub="orders started, not paid" />
        <Tile label="Active Pro" value={m.pro_active} />
        <Tile label="Credits held" value={n(m.credits_outstanding)} sub="across all learners" />
      </div>

      <AdminSection title="By day" description="India time, newest first.">
        <div className="max-h-[28rem] overflow-y-auto">
          <Table label="By day" head={["Day", "Revenue", "Orders", "AI cost", "AI calls"]}>
            {m.daily.map((d) => (
              <tr key={d.day} className="border-t">
                <td className={td}>{day(d.day)}</td>
                <td className={num}>{d.revenue_paise ? inr(d.revenue_paise) : "—"}</td>
                <td className={num}>{d.orders || "—"}</td>
                <td className={num}>{Number(d.ai_inr) ? rupees(d.ai_inr) : "—"}</td>
                <td className={num}>{d.ai_calls ? n(d.ai_calls) : "—"}</td>
              </tr>
            ))}
          </Table>
        </div>
      </AdminSection>

      <AdminSection title="AI cost by feature">
        {m.features.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI calls in this period.</p>
        ) : (
          <Table label="AI cost by feature" head={["Feature", "Calls", "Tokens in", "Tokens out", "Cost", "Share"]}>
            {m.features.map((f) => (
              <tr key={f.feature} className="border-t">
                <td className={td}>{aiFeature(f.feature)}</td>
                <td className={num}>{n(f.calls)}</td>
                <td className={num}>{n(f.tokens_in)}</td>
                <td className={num}>{n(f.tokens_out)}</td>
                <td className={num}>{rupees(f.inr)}</td>
                <td className={num}>{Math.round((Number(f.inr) / featureTotal) * 100)}%</td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>

      <AdminSection
        title="AI cost by model"
        description={m.ai_unpriced ? `${n(m.ai_unpriced)} calls used a model with no price set; they're costed at GPT-6 Luna prices.` : undefined}
      >
        {m.models.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI calls in this period.</p>
        ) : (
          <Table label="AI cost by model" head={["Model", "Calls", "Tokens in", "Tokens out", "Cost"]}>
            {m.models.map((x) => (
              <tr key={x.model} className="border-t">
                <td className={td}>
                  <span className="font-mono text-xs">{x.model}</span> {x.priced ? null : <Pill tone="warn">No price set</Pill>}
                </td>
                <td className={num}>{n(x.calls)}</td>
                <td className={num}>{n(x.tokens_in)}</td>
                <td className={num}>{n(x.tokens_out)}</td>
                <td className={num}>{rupees(x.inr)}</td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>

      <AdminSection
        title="Costliest learners"
        description={`The 20 learners whose AI use cost most in this period, and what they paid.${Number(m.unattributed_inr) ? ` ${rupees(m.unattributed_inr)} of AI cost isn't tied to a learner (calls from before 14 Nov 2026, or signed out).` : ""}`}
      >
        {m.learners.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI use tied to a learner yet.</p>
        ) : (
          <ol className="divide-y rounded-lg border text-sm" aria-label="Costliest learners">
            {m.learners.map((l, i) => (
              <li key={l.user_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5">
                <p className="min-w-0 break-all">
                  <span className="mr-2 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                  <Link href={`/admin/users/${l.user_id}`} className="hover:underline">
                    {l.email ?? "[deleted user]"}
                  </Link>
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{rupees(l.inr)}</span> AI · {n(l.calls)} calls · paid {l.paid_paise ? inr(l.paid_paise) : "nothing"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </AdminSection>

      <AdminSection title="Credits" description="Credits added and used in this period, by reason.">
        {m.credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credit changes in this period.</p>
        ) : (
          <Table label="Credits" head={["Reason", "Added", "Used", "Entries"]}>
            {m.credits.map((c) => (
              <tr key={c.reason} className="border-t">
                <td className={td}>{CREDIT_REASONS[c.reason] ?? c.reason}</td>
                <td className={num}>{c.added ? `+${n(c.added)}` : "—"}</td>
                <td className={num}>{c.used ? n(c.used) : "—"}</td>
                <td className={num}>{n(c.entries)}</td>
              </tr>
            ))}
          </Table>
        )}
      </AdminSection>

      <AdminSection title={`Payments (${payments.data.total})`} description="Every order, newest first. Not completed means checkout was opened but not paid.">
        <nav aria-label="Payment status" className="mb-4 flex flex-wrap gap-2 text-sm">
          {STATUSES.map((s) => (
            <Link key={s.id} href={href({ status: s.id })} aria-current={s.id === status ? "page" : undefined} className={tabClass(s.id === status)}>
              {s.label}
            </Link>
          ))}
        </nav>
        {payments.data.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments.</p>
        ) : (
          <Table label="Payments" head={["When", "Learner", "Product", "Amount", "Status", "Payment ID"]}>
            {payments.data.rows.map((x, i) => (
              <tr key={x.razorpay_order_id ?? i} className="border-t">
                <td className={td}>{when(x.paid_at ?? x.created_at)}</td>
                <td className={`${td} text-right`}>
                  {x.user_id ? (
                    <Link href={`/admin/users/${x.user_id}`} className="hover:underline">
                      {x.email ?? "[deleted user]"}
                    </Link>
                  ) : (
                    "[deleted user]"
                  )}
                </td>
                <td className={`${td} text-right`}>{PRODUCTS[x.product as ProductId]?.label ?? x.product}</td>
                <td className={num}>{inr(x.amount_paise)}</td>
                <td className={`${td} text-right`}>
                  {x.status === "paid" ? "Paid" : x.status === "created" ? <Pill tone="warn">Not completed</Pill> : <Pill tone="danger">Failed</Pill>}
                </td>
                <td className={`${td} text-right font-mono text-xs`}>{x.razorpay_payment_id ?? "—"}</td>
              </tr>
            ))}
          </Table>
        )}
        {pages > 1 ? (
          <nav aria-label="Payment pages" className="mt-3 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="text-primary hover:underline">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="tabular-nums text-muted-foreground">
              {first + 1}–{Math.min(first + PAYMENTS_PER_PAGE, payments.data.total)} of {payments.data.total}
            </span>
            {page < pages ? (
              <Link href={href({ page: page + 1 })} className="text-primary hover:underline">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </AdminSection>

      <AdminSection
        title="Dollar rate"
        description={`AI providers bill in US dollars; every AI cost here is converted at this rate. Last set ${when(m.rate.updated_at)}${m.rate.by ? ` by ${m.rate.by}` : ""}.`}
      >
        <UsdInrForm rate={Number(m.rate.usd_inr)} />
        <p className="mt-4 text-xs text-muted-foreground">
          Prices per million tokens:{" "}
          {m.prices.map((x) => `${x.model} ₹${(Number(x.in) * Number(m.rate.usd_inr)).toFixed(2)} in, ₹${(Number(x.out) * Number(m.rate.usd_inr)).toFixed(2)} out`).join(" · ")}
        </p>
      </AdminSection>
    </>
  )
}
