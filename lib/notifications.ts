/** Notifications (migration 023). Shared by the bell, the /notifications page and tests. Pure. */

export type Notification = {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  ref: string | null
  read_at: string | null
  created_at: string
}

export const NOTIFICATION_COLUMNS = "id, kind, title, body, link, ref, read_at, created_at"

/** Only paths on this site are followed ("/teach#inbox"); anything else is ignored. */
export function safeLink(link: string | null | undefined): string | null {
  return typeof link === "string" && /^\/[A-Za-z0-9]/.test(link) && !link.startsWith("//") ? link : null
}

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 Nov". */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 2 * 86400) return "yesterday"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

/**
 * Add newly arrived notifications to a list, newest first. A new one replaces an older unread one about the same
 * thing (same kind and ref), as the database does.
 */
export function mergeNotifications(list: Notification[], incoming: Notification[], max = 20): Notification[] {
  const out = [...list]
  for (const n of incoming) {
    const i = out.findIndex((o) => o.id === n.id || (n.ref !== null && o.ref === n.ref && o.kind === n.kind && o.read_at === null))
    if (i >= 0) out.splice(i, 1)
    out.push(n)
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, max)
}
