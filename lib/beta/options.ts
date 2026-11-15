// Closed beta (migration 041): the application's choices and shapes, shared by the form and the server.

export type BetaRole = "school" | "college" | "working" | "teacher" | "other"
export type BetaDevice = "android" | "iphone" | "computer" | "tablet"
export type BetaApplication = {
  status: "waiting" | "approved" | "declined"
  name: string
  role: BetaRole
  goal: string
  device: BetaDevice
  heard_from: string | null
  whatsapp?: string | null // migration 046
  created_at: string
  decided_at: string | null
}
export type BetaStatus = { closed: boolean; signed_in: boolean; access: boolean; beta_tester: boolean; application: BetaApplication | null }

export const BETA_ROLES: { id: BetaRole; label: string }[] = [
  { id: "school", label: "School student" },
  { id: "college", label: "College student" },
  { id: "working", label: "Working" },
  { id: "teacher", label: "Teacher" },
  { id: "other", label: "Something else" },
]
export const BETA_DEVICES: { id: BetaDevice; label: string }[] = [
  { id: "android", label: "Android phone" },
  { id: "iphone", label: "iPhone" },
  { id: "computer", label: "Laptop or desktop" },
  { id: "tablet", label: "Tablet" },
]

/** A shared beta link's name (krpex.in/beta?ref=<name>): lower-case letters, digits and dashes, up to 40. Anything else → null. */
export function betaRef(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : ""
  return /^[a-z0-9][a-z0-9-]{0,39}$/.test(v) ? v : null
}
export const BETA_REF_KEY = "krpex-beta-ref" // localStorage: the link someone first arrived through

/**
 * A WhatsApp number as typed → "+<country code><number>", or null if it isn't one. 10-digit Indian mobiles
 * (also written 0…, 91… or with spaces and dashes) get +91; other countries need the + and country code.
 * Mirrors private.whatsapp_number (migration 046).
 */
export function whatsappNumber(value: unknown): string | null {
  const t = typeof value === "string" ? value.trim().replace(/[\s().-]/g, "") : ""
  if (/^[6-9]\d{9}$/.test(t)) return `+91${t}`
  if (/^0[6-9]\d{9}$/.test(t)) return `+91${t.slice(1)}`
  if (/^91[6-9]\d{9}$/.test(t)) return `+${t}`
  if (/^\+[1-9]\d{7,14}$/.test(t)) return t
  return null
}
