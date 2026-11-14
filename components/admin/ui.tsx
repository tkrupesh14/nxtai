import { AccountSection } from "@/components/learn/account-section"

// Small pieces shared by the admin sections.

export const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
export const usd = (v: number | string) => `$${Number(v).toFixed(Number(v) < 1 ? 3 : 2)}`
export const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—"

export const th = "px-3 py-2 text-left font-medium whitespace-nowrap"
export const td = "px-3 py-2 whitespace-nowrap"

export function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

/** Section title, optional note, and an alert if any of its data failed to load. */
export function AdminHeading({ title, note, errors = [] }: { title: string; note?: string; errors?: (string | null)[] }) {
  const error = errors.find(Boolean)
  return (
    <header className="grid gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
      {error ? (
        <p role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
          Some data couldn&apos;t load: {error}
        </p>
      ) : null}
    </header>
  )
}

export { AccountSection as AdminSection }

/** One line for an admin audit entry (admin_audit, migration 036). */
export function auditText(a: { action: string; detail: Record<string, unknown> }) {
  const d = a.detail ?? {}
  const what = d.comment ? "a comment" : "a post"
  switch (true) {
    case a.action === "grant": {
      const credits = Number(d.credits ?? 0)
      const days = Number(d.pro_days ?? 0)
      const parts = [credits ? `${credits > 0 ? "gave" : "took"} ${Math.abs(credits)} credits` : "", days ? `gave ${days} Pro days` : ""].filter(Boolean)
      return parts.join(" and ").replace(/^./, (c) => c.toUpperCase())
    }
    case a.action === "unban":
      return "Let them post again"
    case a.action.startsWith("ban:"):
      return a.action === "ban:forever" ? "Stopped them posting for good" : `Stopped them posting for ${a.action.slice(4)} days`
    case a.action === "hide_profile":
      return "Hid their profile page"
    case a.action === "show_profile":
      return "Showed their profile page again"
    case a.action === "keep":
      return `Kept ${what} after reports`
    case a.action === "remove":
      return `Removed ${what}`
    case a.action === "board_off":
      return `Turned off the ${d.title ?? d.board} board`
    case a.action === "board_on":
      return `Turned on the ${d.title ?? d.board} board`
    case a.action === "resolve_report":
      return `Resolved their lesson report${d.lesson ? ` on “${d.lesson}”` : ""}`
    case a.action === "professor_invite":
      return `Invited ${d.email} to teach ${d.subject}`
    case a.action === "professor_invite_revoked":
      return `Withdrew the teaching invite for ${d.email}`
    case a.action === "professor:approved":
      return "Approved them as a professor"
    case a.action === "professor:suspended":
      return "Suspended them as a professor"
    case a.action === "professor:pending":
      return "Moved their professor application back to pending"
    case a.action === "professor_listed":
      return "Showed their AI professor to learners"
    case a.action === "professor_unlisted":
      return "Hid their AI professor from learners"
    default:
      return a.action
  }
}

/** A small rounded label. */
export function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "primary" | "warn" | "danger" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    danger: "bg-destructive/15 text-destructive-foreground",
  }
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}
