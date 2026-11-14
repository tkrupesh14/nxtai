import { codeHref, communityHref, mainHref } from "@/lib/code-host"

// Feedback from testers (closed beta B.2, migration 042). Shared by the Feedback button, /account/feedback and the admin page.
export type FeedbackKind = "bug" | "suggestion" | "confusing"
export type FeedbackSite = "main" | "code" | "community"
export type FeedbackStatus = "new" | "planned" | "in_progress" | "fixed" | "wont_fix"

export const FEEDBACK_KINDS: { id: FeedbackKind; label: string; prompt: string }[] = [
  { id: "bug", label: "Something's broken", prompt: "What happened? What did you expect?" },
  { id: "confusing", label: "Something's confusing", prompt: "What was confusing?" },
  { id: "suggestion", label: "An idea", prompt: "What would make Krpex better for you?" },
]
export const FEEDBACK_STATUSES: { id: FeedbackStatus; label: string }[] = [
  { id: "new", label: "New" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "fixed", label: "Fixed" },
  { id: "wont_fix", label: "Won't fix" },
]
export const FEEDBACK_SITES: { id: FeedbackSite; label: string }[] = [
  { id: "main", label: "krpex.in" },
  { id: "code", label: "Krpex Code" },
  { id: "community", label: "Krpex Community" },
]

export const kindLabel = (id: string) => ({ bug: "Bug", confusing: "Confusing", suggestion: "Idea" })[id] ?? id
export const statusLabel = (id: string) => FEEDBACK_STATUSES.find((s) => s.id === id)?.label ?? id
export const siteLabel = (id: string) => FEEDBACK_SITES.find((s) => s.id === id)?.label ?? id

/** Screenshots: same limits as the "feedback" Storage bucket. */
export const SCREENSHOT_TYPES: Record<string, "png" | "jpg" | "webp"> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const FEEDBACK_BUCKET = "feedback"

/** What the browser adds to a report. */
export type FeedbackContext = { screen?: string; viewport?: string; language?: string; errors?: { message: string; at: string }[] }

export type FeedbackRow = {
  id: string
  kind: FeedbackKind
  body: string
  site: FeedbackSite
  path: string
  screenshot: string | null
  status: FeedbackStatus
  reply: string | null
  replied_at: string | null
  created_at: string
}

/** Link to the page a report was sent from, from a page on `host`. */
export function feedbackPageHref(site: string, path: string, host: string | null) {
  return site === "code" ? codeHref(path, host) : site === "community" ? communityHref(path, host) : mainHref(path, host)
}
