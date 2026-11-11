import { AdminHeading, AdminSection, inr, td, th, Tile, when } from "@/components/admin/ui"
import { getOverview, getPayments, requireAdmin } from "@/lib/admin/data"
import { PRODUCTS, type ProductId } from "@/lib/learning/plans"

export const metadata = { title: "Money — Admin — Krpex" }

export default async function AdminMoney() {
  await requireAdmin()
  const [overview, payments] = await Promise.all([getOverview(), getPayments()])
  const o = overview.data
  return (
    <>
      <AdminHeading title="Money" errors={[overview.error, payments.error]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Revenue (30 days)" value={inr(o.revenue_paise_30d ?? 0)} sub={`${inr(o.revenue_paise_total ?? 0)} all time`} />
        <Tile label="Paid orders" value={o.paid_orders_total ?? 0} />
        <Tile label="Active Pro" value={o.pro_active ?? 0} />
        <Tile label="Credits held" value={o.credits_outstanding ?? 0} sub="across all learners" />
      </div>

      <AdminSection title="Recent payments" description="The latest 20, paid or not.">
        {payments.data.length === 0 ? (
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
                {payments.data.map((p, i) => (
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
      </AdminSection>
    </>
  )
}
