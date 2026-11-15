import type { EmailCampaignStatus } from "@/lib/admin/data"

export const EMAIL_STATUS: Record<EmailCampaignStatus, { label: string; tone: "muted" | "primary" | "warn" | "danger" }> = {
  draft: { label: "Draft", tone: "muted" },
  sending: { label: "Sending", tone: "primary" },
  paused: { label: "Paused", tone: "warn" },
  done: { label: "Finished", tone: "muted" },
}
export const pct = (part: number, of: number) => (of > 0 ? `${Math.round((part / of) * 100)}%` : "—")
export const n = (v: number | undefined | null) => (v ?? 0).toLocaleString("en-IN")
