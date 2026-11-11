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
