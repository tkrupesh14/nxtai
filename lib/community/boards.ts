// Community 5c (migration 035): boards on community.krpex.in/c/<board>. Slugs and titles mirror the
// community_boards rows in the migration (tests/unit/community-boards.test.ts checks they match).
import { CATEGORIES } from "@/lib/learning/catalog"

export type BoardKind = "general" | "course"
export type Board = { slug: string; kind: BoardKind; title: string; icon: string; description: string }

const GENERAL: Board[] = [
  { slug: "help", kind: "general", title: "Help", icon: "🙋", description: "Stuck on something? Ask here: code, concepts or how to use Krpex." },
  { slug: "interviews", kind: "general", title: "Interview prep", icon: "🎯", description: "Placements, coding rounds, HR questions and mock interview partners." },
  { slug: "projects", kind: "general", title: "Show your project", icon: "🛠️", description: "Share something you built and get friendly feedback." },
  { slug: "feedback", kind: "general", title: "Feedback for Krpex", icon: "💬", description: "Ideas, bugs and requests for courses, Code and Community." },
]

/** One board per course category ("Physics" lives in Science). */
const COURSE: Board[] = CATEGORIES.map((c) => ({ slug: c.id, kind: "course", title: c.name, icon: c.icon, description: c.description }))

export const BOARDS: Board[] = [...GENERAL, ...COURSE]

export const getBoard = (slug: string | null | undefined) => BOARDS.find((b) => b.slug === slug) ?? null
export const boardSpace = (slug: string) => `board:${slug}`
export const spaceBoard = (space: string) => (/^board:[a-z0-9]+(-[a-z0-9]+)*$/.test(space) ? space.slice(6) : null)

/** Board summary from community_boards(). */
export type BoardStats = { slug: string; kind: BoardKind; title: string; posts: number; last_activity: string | null }

/** community_boards() lists only boards that are on (an admin can turn one off). If it failed to load, treat every board as on. */
export const isBoardOpen = (slug: string, stats: BoardStats[]) => stats.length === 0 || stats.some((s) => s.slug === slug)
