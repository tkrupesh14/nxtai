import Link from "next/link"

import { AdminHashRedirect } from "@/components/admin/hash-redirect"
import { AdminHeading, AdminSection, inr, rupees, td, th, Tile } from "@/components/admin/ui"
import { getCommunityQueue, getDaily, getErrors, getOverview, getProfessors, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "Admin — Krpex" }

// Old notification links point at /admin or /admin#<section>.
const HASHES = { community: "/admin/community" }

export default async function AdminOverview() {
  await requireAdmin()
  const [overview, daily, community, errors, profs] = await Promise.all([getOverview(), getDaily(14), getCommunityQueue(), getErrors(), getProfessors()])
  const o = overview.data
  const queue = community.data
  const professors = profs.data.professors
  const errorCount = errors.data.reduce((n, e) => n + Number(e.count), 0)
  const pending = professors.filter((p) => p.status === "pending").length
  const goLive = professors.filter((p) => p.status === "approved" && p.listing_requested && !p.live).length
  const hidden = queue.filter((c) => c.status === "hidden").length

  const attention = [
    { n: o.reports_open ?? 0, label: "open lesson reports", href: "/admin/reports" },
    { n: queue.length, label: `community items to review${hidden ? ` (${hidden} hidden)` : ""}`, href: "/admin/community" },
    { n: pending, label: "professors waiting for approval", href: "/admin/professors" },
    { n: goLive, label: "professors asking to go live", href: "/admin/professors" },
    { n: errorCount, label: "errors in the last 24 hours", href: "/admin/system" },
  ].filter((a) => a.n > 0)

  return (
    <>
      <AdminHashRedirect map={HASHES} />
      <AdminHeading
        title="Overview"
        note="Days are India time. AI cost uses GPT-6 Luna prices."
        errors={[overview.error, daily.error, community.error, errors.error, profs.error]}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Users" value={o.users_total ?? 0} sub={`+${o.users_today ?? 0} today · ${o.active_7d ?? 0} active 7d`} />
        <Tile label="Courses" value={o.courses_total ?? 0} sub={`+${o.courses_today ?? 0} today`} />
        <Tile label="Today" value={o.lessons_written_today ?? 0} sub={`lessons written · ${o.questions_today ?? 0} questions`} />
        <Tile label="AI spend today" value={rupees(o.ai_inr_today)} sub={`${rupees(o.ai_inr_30d)} last 30 days`} />
        <Tile label="Revenue (30 days)" value={inr(o.revenue_paise_30d ?? 0)} sub={`${inr(o.revenue_paise_total ?? 0)} all time`} />
        <Tile label="Paid orders" value={o.paid_orders_total ?? 0} sub={`${o.pro_active ?? 0} active Pro`} />
        <Tile label="Credits held" value={o.credits_outstanding ?? 0} sub="across all learners" />
        <Tile label="Open reports" value={o.reports_open ?? 0} />
      </div>

      <AdminSection title="Needs attention">
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs you right now.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {attention.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/50">
                  <span>
                    <span className="font-semibold tabular-nums">{a.n}</span> {a.label}
                  </span>
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Last 14 days">
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
              {daily.data.map((d) => (
                <tr key={d.day} className="border-t">
                  <td className={td}>{new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</td>
                  <td className={td}>{d.signups}</td>
                  <td className={td}>{d.courses}</td>
                  <td className={td}>{d.lessons}</td>
                  <td className={td}>{d.questions}</td>
                  <td className={td}>{rupees(d.ai_inr)}</td>
                  <td className={td}>{inr(d.revenue_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </>
  )
}
