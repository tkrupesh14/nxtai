/**
 * Keeping "Ask the professor" from handing out answers to graded questions (practice questions,
 * the lesson quiz, module tests and the final exam). Pure functions, unit tested.
 */

export type GradedQuestion = { question: string; options: string[] }

/** The lesson's practice and quiz questions (never their answers) for the professor's prompt. */
export function gradedQuestionsText(checkpoints: GradedQuestion[], quiz: GradedQuestion[], maxChars = 4000): string {
  const line = (label: string, q: GradedQuestion) =>
    `${label}: ${q.question.replace(/\s+/g, " ").trim()}\n   Options: ${q.options.map((o, i) => `(${"ABCD"[i] ?? i + 1}) ${o.replace(/\s+/g, " ").trim()}`).join("  ")}`
  const lines = [
    ...checkpoints.map((q, i) => line(`Practice ${i + 1}`, q)),
    ...quiz.map((q, i) => line(`Quiz ${i + 1}`, q)),
  ]
  const text = lines.join("\n")
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}

// Option letters are matched in capitals only, so "the answer is a force…" doesn't count.
const REVEAL_PATTERNS = [
  // "the correct answer is …", "the right option would be …", "correct choice: …"
  /\b(?:correct|right)\s+(?:answer|option|choice|response)\s*(?:is|was|would\s+be|here\s+is|:)/i,
  // "answer: B", "Answer is (C)", "answer — option D", "answer is (2)"
  /\b[Aa]nswer\s*(?:is|:|—|-|=)\s*(?:[Oo]ption\s*)?(?:\(\s*[A-D1-4]\s*\)|[A-D](?=[\s.,;:)!]|$))/,
  // "option B is correct", "(C) is right", "B is the correct one"
  /(?:\b[Oo]ption\s*\(?\s*[A-D1-4]|\(\s*[A-D1-4]\s*\)|\b[A-D]\)?)\s+(?:is|would\s+be)\s+(?:the\s+)?(?:correct|right)\b/,
  // "pick B", "choose option C", "go with (A)"
  /\b(?:[Pp]ick|[Cc]hoose|[Ss]elect|[Gg]o\s+with|[Tt]ick|[Mm]ark)\s+(?:[Oo]ption\s*)?(?:\(\s*[A-D1-4]\s*\)|[A-D](?=[\s.,;:)!]|$))/,
  // Hindi: सही उत्तर / सही जवाब / सही विकल्प
  /सही\s*(?:उत्तर|जवाब|विकल्प)/,
]

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )

/** True when the learner's question is (close to) one of the given graded questions. */
export function matchesGraded(question: string, graded: GradedQuestion[]): boolean {
  const asked = words(question)
  if (asked.size < 3) return false
  return graded.some((g) => {
    const target = words(g.question)
    if (target.size < 3) return false
    let shared = 0
    for (const w of target) if (asked.has(w)) shared++
    return shared / target.size >= 0.6
  })
}

/** True when a reply states or confirms which option is correct. */
export function revealsAnswer(reply: string): boolean {
  return REVEAL_PATTERNS.some((p) => p.test(reply))
}

/** Shown if the professor still gives an answer away after being asked to rewrite. */
export const HINT_FALLBACK =
  "I can't give you the answer to a practice, quiz or test question, but I can help you get there. " +
  "Tell me which option you're leaning towards and why, or ask me to explain the idea behind the question again."
