// "Ask the professor" limits and labels. Safe to import from client components.
// The limits are enforced by public.take_question_credit() in migration 005; keep both in sync.

export const ASK_LIMITS = {
  perDay: 5,
  perLessonPerDay: 3,
  maxQuestionChars: 300,
  quickPerDay: 15,
} as const

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
}

export type AskResult =
  | { ok: true; turn: ChatTurn; usedToday: number; usedLesson: number; cached: boolean }
  | { ok: false; message: string; usedToday?: number; usedLesson?: number }

export const LIMIT_MESSAGES: Record<string, string> = {
  slow_down: "One moment, please wait a few seconds between questions.",
  daily_limit: `You've used today's ${ASK_LIMITS.perDay} questions. Your professor will be back tomorrow.`,
  lesson_limit: `You've asked ${ASK_LIMITS.perLessonPerDay} questions on this lesson today. Try the quick buttons, or continue tomorrow.`,
  busy: "Your professor is already answering that. Give it a moment.",
  not_found: "This lesson isn't available.",
  auth: "Please sign in again.",
}

/** Normalise a question for repeat detection: case, spacing and trailing punctuation don't matter. */
export const normalizeQuestion = (q: string) =>
  q.toLowerCase().replace(/\s+/g, " ").replace(/[?.!\s]+$/, "").trim()
