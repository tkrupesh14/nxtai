// Community 5b (migration 034): posts, comments, votes and reports. Limits and errors mirror the database.

export type PostKind = "solution" | "discussion"
/** URL segment on community.krpex.in/p/<slug>/<section>. */
export type Section = "solutions" | "discuss"

export const SECTION_KIND: Record<Section, PostKind> = { solutions: "solution", discuss: "discussion" }
export const KIND_SECTION: Record<PostKind, Section> = { solution: "solutions", discussion: "discuss" }
export const isSection = (s: string): s is Section => s === "solutions" || s === "discuss"

export const problemSpace = (slug: string) => `code:p:${slug}`
export const spaceProblem = (space: string) => (/^code:p:[a-z0-9]+(-[a-z0-9]+)*$/.test(space) ? space.slice(7) : null)

export const LIMITS = { title: 120, body: 10000, code: 20000, comment: 2000, note: 500 } as const
export const POST_LEVEL = 2

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or advertising" },
  { value: "abuse", label: "Rude, hateful or harassing" },
  { value: "spoiler", label: "Gives away a solution outside Solutions" },
  { value: "wrong", label: "Wrong or misleading" },
  { value: "other", label: "Something else" },
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]["value"]

export type AuthorCard = { handle: string; name: string; level: number; public: boolean } | { deleted: true }
export const isDeleted = (a: AuthorCard | null | undefined): a is { deleted: true } | null | undefined => !a || "deleted" in a

export type PostSummary = {
  id: string
  title: string
  excerpt: string | null
  language: "python" | "javascript" | null
  spoiler: boolean
  score: number
  comments: number
  created_at: string
  edited: boolean
  author: AuthorCard
  mine: boolean
  voted: boolean
}

export type PostList = { locked: boolean; posts: PostSummary[]; counts: Record<PostKind, number> }

export type Post = {
  id: string
  space: string
  kind: PostKind
  title: string
  body: string
  code: string | null
  language: "python" | "javascript" | null
  spoiler: boolean
  score: number
  comments: number
  status: "visible" | "hidden"
  created_at: string
  edited_at: string | null
  author: AuthorCard
  mine: boolean
  voted: boolean
}

export type Comment = {
  id: string
  parent_id: string | null
  created_at: string
  edited: boolean
  /** "gone": removed or deleted, kept only because someone replied. */
  status: "visible" | "hidden" | "gone"
  body: string | null
  author: AuthorCard | null
  score: number
  mine: boolean
  voted: boolean
}

export type Thread = { locked: true; post: Pick<Post, "id" | "space" | "kind" | "title"> } | { locked: false; post: Post; comments: Comment[] }

export type MyCommunityStatus = { can_post: boolean; reason: string | null; level?: number; links?: boolean; handle?: string | null }

export const COMMUNITY_ERRORS: Record<string, string> = {
  not_signed_in: "Please log in first.",
  need_handle: "Claim a handle on your account page first.",
  account_too_new: "New accounts can post after 24 hours.",
  need_level_2: `Posting unlocks at level ${POST_LEVEL}. Solve a problem or pass a lesson to get there.`,
  banned: "You can't post right now. Contact us if you think this is a mistake.",
  links_need_level_4: "Links unlock at level 4. Please remove the link.",
  bad_title: `Give it a title of 3 to ${LIMITS.title} characters.`,
  bad_body: `Please write something (up to ${LIMITS.body.toLocaleString("en-IN")} characters for posts, ${LIMITS.comment.toLocaleString("en-IN")} for comments).`,
  bad_code: `Code can be up to ${LIMITS.code.toLocaleString("en-IN")} characters.`,
  bad_language: "Choose the language of your code.",
  need_code: "Add your code to share a solution.",
  bad_space: "That problem doesn't exist.",
  solve_first: "Solve the problem first to share your solution.",
  too_many_posts: "That's 5 posts today — please come back tomorrow.",
  too_many_comments: "That's 30 comments today — please come back tomorrow.",
  too_many_votes: "That's a lot of votes today — please come back tomorrow.",
  too_many_reports: "You've sent a lot of reports today. Thanks — we'll look at them.",
  too_fast: "Please wait a few seconds before posting again.",
  locked: "Solve the problem (or open its official solution) to see its community solutions.",
  own_post: "That's yours.",
  not_found: "That post or comment isn't available any more.",
  bad_reason: "Please choose a reason.",
}

export function communityError(message: string | undefined, fallback = "Something went wrong. Please try again."): string {
  const code = Object.keys(COMMUNITY_ERRORS).find((k) => message?.includes(k))
  return code ? COMMUNITY_ERRORS[code] : fallback
}

/** "2 h ago", "3 Nov" — short dates for posts and comments. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: s > 300 * 86400 ? "numeric" : undefined, timeZone: "Asia/Kolkata" })
}
