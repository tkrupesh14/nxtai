// Public profiles (community Phase 5a, migration 033). The same rules are checked in the database
// (save_public_profile); tests/db/public-profiles.test.ts checks the two agree.

export const HANDLE_RE = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/
export const NAME_MAX = 40
export const BIO_MAX = 160
/** Days between handle changes. */
export const HANDLE_COOLDOWN_DAYS = 30
/** Level from which names and bios (and later posts) may contain links. */
export const LINK_LEVEL = 4

export const RESERVED_HANDLES = [
  "about", "account", "admin", "anonymous", "api", "code", "contact", "deleted", "discuss", "help", "home", "learn",
  "login", "logout", "me", "mod", "mods", "null", "plans", "playground", "pricing", "privacy", "problems", "professor",
  "professors", "profile", "root", "settings", "signup", "solutions", "staff", "support", "system", "teach", "team",
  "terms", "undefined", "user", "users", "www",
]

export const isReservedHandle = (h: string) => RESERVED_HANDLES.includes(h) || /(krpex|admin|moderat|official)/.test(h)

/** Looks like a link (private.has_link). */
export const hasLink = (text: string) =>
  /(https?:\/\/|www\.|[a-z0-9-]+\.(com|in|io|net|org|co|xyz|me|ly|dev|app|link|site|info|biz|online|shop|top)\b)/i.test(text)

/** The handle as the database will store it. */
export const normaliseHandle = (h: string) => h.trim().toLowerCase()

/** What's wrong with a handle, or null. */
export function handleProblem(raw: string): string | null {
  const h = normaliseHandle(raw)
  if (h.length < 3 || h.length > 20) return "Use 3 to 20 characters."
  if (!HANDLE_RE.test(h)) return "Use lowercase letters, numbers and _ (not at the start or end)."
  if (isReservedHandle(h)) return "That handle is reserved. Please pick another."
  return null
}

export const PROFILE_ERRORS: Record<string, string> = {
  not_signed_in: "Please log in again.",
  "beta access required": "Community profiles are open to beta testers. Apply at krpex.in/beta.",
  bad_handle: "Use 3 to 20 lowercase letters, numbers and _ (not at the start or end).",
  reserved_handle: "That handle is reserved. Please pick another.",
  handle_taken: "That handle is taken. Please pick another.",
  handle_change_too_soon: `You can change your handle once every ${HANDLE_COOLDOWN_DAYS} days.`,
  bad_name: `Please enter a display name of up to ${NAME_MAX} characters (without "Krpex").`,
  bad_bio: `Please keep your bio under ${BIO_MAX} characters.`,
  links_need_level_4: `Links in your name or bio unlock at level ${LINK_LEVEL}.`,
}

export function profileError(message: string | undefined): string {
  const code = Object.keys(PROFILE_ERRORS).find((k) => message?.includes(k))
  return code ? PROFILE_ERRORS[code] : "Couldn't save your profile. Please try again."
}

export type MyPublicProfile = {
  handle: string
  display_name: string
  bio: string
  is_public: boolean
  show_solves: boolean
  hidden: boolean
  handle_changed_at: string
}

export type PublicProfile = {
  handle: string
  /** Took part in the closed beta (migration 041). */
  beta_tester?: boolean
  display_name: string
  bio: string
  joined: string | null
  xp: number
  lessons: number
  study_days: string[]
  frozen_days: string[]
  solved: { easy: number; medium: number; hard: number }
  /** Recent solves, newest first; null unless the learner chose to show them. */
  recent: { problem: string; at: string }[] | null
  activity: Record<string, number>
  plans: { plan: string; at: string }[]
}

/** When the handle can next be changed, or null if it can be changed now. */
export function nextHandleChange(changedAt: string, now = Date.now()): Date | null {
  const t = Date.parse(changedAt) + HANDLE_COOLDOWN_DAYS * 86_400_000
  return t > now ? new Date(t) : null
}
