import "server-only"

// Practice problems for a coding lesson (v2 Phase 4, plan.md "Krpex Code v2"): the lesson's title, objective and
// takeaways are matched to Krpex Code tags by keyword, and the best-matching problems (easiest first for beginner
// courses) are linked at the end of the lesson. Only for courses where our Python / JavaScript problems fit.

import type { Tag } from "@/lib/code/meta"
import { PROBLEM_SUMMARIES, type ProblemSummary } from "@/lib/code/problems"

/** Coding subcategories whose lessons get practice problems (lib/learning/catalog.ts). */
export const PRACTICE_SUBCATEGORIES = ["python", "dsa", "web-dev"]

const KEYWORDS: [RegExp, Tag][] = [
  [/\bstrings?\b|\bcharacters?\b|\bsubstrings?\b|\bpalindrome/i, "String"],
  [/\blists?\b|\barrays?\b|\btuples?\b/i, "Array"],
  [/\bdict(ionar(y|ies))?\b|\bhash ?(map|table|ing)\b|\bsets?\b|\bmaps?\b|\bobjects?\b/i, "Hash table"],
  [/\brecursi/i, "Recursion"],
  [/\bsort(s|ing|ed)?\b/i, "Sorting"],
  [/\bbinary search\b/i, "Binary search"],
  [/\bstacks?\b|\bqueues?\b/i, "Stack"],
  [/\bdynamic programming\b|\bmemoi[sz]/i, "Dynamic programming"],
  [/\bmatri(x|ces)\b|\bgrids?\b|\b2d\b|\bnested lists?\b/i, "Matrix"],
  [/\btwo pointers?\b/i, "Two pointers"],
  [/\bsliding window\b/i, "Sliding window"],
  [/\bprefix sums?\b/i, "Prefix sum"],
  [/\bbits?\b|\bbitwise\b|\bbinary numbers?\b/i, "Bit manipulation"],
  [/\bbacktrack/i, "Backtracking"],
  [/\bgreedy\b/i, "Greedy"],
  [/\bgraphs?\b|\bdfs\b|\bdepth[- ]first\b|\bflood fill\b/i, "Depth-first search"],
  [/\bloops?\b|\bwhile\b|\bfor\b|\brange\(|\biterat/i, "Simulation"],
  [/\bnumbers?\b|\barithmetic\b|\boperators?\b|\bvariables?\b|\bconditions?\b|\bif\b|\bmath/i, "Math"],
]

const RANK = { easy: 0, medium: 1, hard: 2 } as const

/** The tags a lesson's text is about, most specific first. */
export function lessonTags(text: string): Tag[] {
  return KEYWORDS.filter(([re]) => re.test(text)).map(([, tag]) => tag)
}

/** Up to `n` problems for a lesson. Beginner courses get the easiest matches first. */
export function practiceFor(text: string, level: string, n = 3): { problems: ProblemSummary[]; tag: Tag | null } {
  const tags = lessonTags(text)
  if (!tags.length) return { problems: [], tag: null }
  const weight = new Map(tags.map((t, i) => [t, tags.length - i]))
  const beginner = !/advanced|intermediate/i.test(level)
  const scored = PROBLEM_SUMMARIES.map((p) => ({ p, score: p.tags.reduce((s, t) => s + (weight.get(t) ?? 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => (beginner ? RANK[a.p.difficulty] - RANK[b.p.difficulty] : 0) || b.score - a.score || RANK[a.p.difficulty] - RANK[b.p.difficulty])
  return { problems: scored.slice(0, n).map((x) => x.p), tag: tags[0] }
}
