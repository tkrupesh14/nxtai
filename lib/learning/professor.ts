// "Ask the professor" labels and messages. Safe to import from client components.
// Daily limits depend on the plan (lib/learning/plans.ts) and are enforced by take_question_credit().

export const ASK_LIMITS = { maxQuestionChars: 300 } as const

export const QUICK_KINDS = {
  simpler: { label: "Explain it simpler", prompt: "Explain this section again in simpler words, as if I'm new to it." },
  example: { label: "Another example", prompt: "Give me one more example for this section, different from the one in the lesson." },
  mistake: { label: "What do people get wrong?", prompt: "What do students most often get wrong about this section, and how do I avoid it?" },
} as const
export type QuickKind = keyof typeof QUICK_KINDS
export const isQuickKind = (k: string): k is QuickKind => k in QUICK_KINDS

export type ChatTurn = {
  id: string
  kind: "ask" | QuickKind
  section: number
  question: string
  reply: string
  verdict: "answer" | "off_topic" | "not_allowed"
  /** Sent to the real professor to check (8.4), with their reply once they've answered. */
  flag?: { status: "open" | "answered" | "confirmed"; reply: string | null } | null
}

export type AskResult =
  | { ok: true; turn: ChatTurn; usedToday: number; usedLesson: number; cached: boolean; paid: boolean; credits?: number }
  | { ok: false; message: string; usedToday?: number; usedLesson?: number; credits?: number }

export const LIMIT_MESSAGES: Record<string, string> = {
  slow_down: "One moment, please wait a few seconds between questions.",
  daily_limit: "You've used today's free questions. Recharge credits to keep asking, or come back tomorrow.",
  lesson_limit: "You've used today's free questions for this lesson. Try the quick buttons, use credits, or continue tomorrow.",
  quick_daily_limit: "You've used today's quick answers. Ones you've already opened stay free.",
  busy: "Your professor is already answering that. Give it a moment.",
  not_found: "This lesson isn't available.",
  auth: "Please sign in again.",
}

/** Normalise a question for repeat detection: case, spacing and trailing punctuation don't matter. */
export const normalizeQuestion = (q: string) =>
  q.toLowerCase().replace(/\s+/g, " ").replace(/[?.!\s]+$/, "").trim()
