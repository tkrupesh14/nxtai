import "server-only"

// Krpex Code study plans (v2 Phase 4, plan.md "Krpex Code v2"): ordered problem lists with progress and a finish
// bonus. Mirrored in coding_plans (migration 032), which awards the bonus when the last problem is solved;
// tests/db/coding-plans.test.ts checks the two agree and tests/unit/code-plans.test.ts checks every slug exists.

import { PROBLEMS, TOPICS, problemBySlug } from "@/lib/code/problems"

export type PlanSection = { title: string; problems: string[] }
export type StudyPlan = {
  slug: string
  title: string
  tagline: string
  level: "Beginner" | "Intermediate" | "Advanced" | "All levels"
  pace: string
  /** XP for finishing (once; at most 100). */
  bonus: number
  sections: PlanSection[]
}

const byTopic: PlanSection[] = TOPICS.map((topic) => ({
  title: topic,
  problems: PROBLEMS.filter((p) => p.topic === topic).map((p) => p.slug),
})).filter((s) => s.problems.length > 0)

export const PLANS: StudyPlan[] = [
  {
    slug: "python-basics-30",
    title: "Python basics in 30 days",
    tagline: "One easy problem a day: variables and conditions, loops, strings, lists and dictionaries.",
    level: "Beginner",
    pace: "1 problem a day · 30 days",
    bonus: 50,
    sections: [
      { title: "Week 1 · First steps", problems: ["add-two-numbers", "even-or-odd", "largest-of-three", "celsius-to-fahrenheit", "exam-grade", "leap-year", "times-table"] },
      { title: "Week 2 · Loops and numbers", problems: ["sum-to-n", "factorial", "fizzbuzz", "count-digits", "digit-sum", "is-prime", "electricity-bill"] },
      { title: "Week 3 · Strings", problems: ["reverse-a-string", "count-vowels", "is-palindrome", "count-words", "title-case", "acronym", "is-anagram"] },
      { title: "Week 4 · Lists and dictionaries", problems: ["sum-of-a-list", "largest-in-a-list", "count-evens", "running-sum", "remove-duplicates", "invert-a-dictionary", "first-repeated"] },
      { title: "Days 29–30 · Put it together", problems: ["ransom-note", "sort-by-length"] },
    ],
  },
  {
    slug: "placement-arrays-strings",
    title: "Placement prep: arrays and strings",
    tagline: "The array and string questions campus interviews ask most — two pointers, sliding windows, hashing and prefix sums.",
    level: "Intermediate",
    pace: "2–3 problems a day · about 2 weeks",
    bonus: 75,
    sections: [
      { title: "Array warm-up", problems: ["second-largest", "move-zeros", "rotate-a-list", "missing-number", "best-time-to-buy", "majority-element"] },
      { title: "Two pointers and windows", problems: ["two-sum", "merge-sorted-lists", "container-with-most-water", "sort-zeros-ones-twos", "longest-unique-substring", "anagram-positions"] },
      { title: "Hashing and prefix sums", problems: ["group-anagrams", "first-unique-character", "longest-consecutive-run", "subarray-sum-equals-k", "product-except-self", "count-pairs-with-sum"] },
      { title: "Strings", problems: ["palindrome-sentence", "compress-a-string", "longest-common-prefix", "is-subsequence", "longest-palindromic-substring", "word-break"] },
    ],
  },
  {
    slug: "interview-patterns",
    title: "Interview patterns: search, stacks and recursion",
    tagline: "Binary search beyond the basics, stack tricks, backtracking and grid searches — the patterns behind most medium questions.",
    level: "Intermediate",
    pace: "2 problems a day · about 2 weeks",
    bonus: 75,
    sections: [
      { title: "Binary search", problems: ["binary-search", "first-and-last-position", "minimum-in-rotated-list", "search-rotated-list", "integer-square-root", "search-a-sorted-grid"] },
      { title: "Stacks", problems: ["balanced-brackets", "next-greater-element", "daily-temperatures", "reverse-polish-notation", "decode-string", "largest-rectangle-in-histogram"] },
      { title: "Recursion and backtracking", problems: ["all-subsets", "all-permutations", "generate-parentheses", "combination-sum", "n-queens"] },
      { title: "Grids", problems: ["rotate-a-grid", "flood-fill", "count-islands", "spiral-order"] },
    ],
  },
  {
    slug: "dynamic-programming",
    title: "Dynamic programming from zero",
    tagline: "From Fibonacci to edit distance: learn to spot the subproblem, write the recurrence, and build it up.",
    level: "Advanced",
    pace: "1 problem a day · about 2 weeks",
    bonus: 75,
    sections: [
      { title: "Warm-up: one step at a time", problems: ["fibonacci", "climbing-stairs", "min-cost-stairs", "house-robber", "grid-paths", "minimum-path-sum"] },
      { title: "Choices: take it or leave it", problems: ["coin-change", "knapsack", "partition-equal-sums", "decode-ways"] },
      { title: "Sequences and strings", problems: ["maximum-subarray", "maximum-product-subarray", "longest-increasing-subsequence", "longest-common-subsequence", "edit-distance", "word-break"] },
    ],
  },
  {
    slug: "krpex-150",
    title: "Krpex 150",
    tagline: "Every problem on Krpex Code, topic by topic — from first loops to dynamic programming.",
    level: "All levels",
    pace: "At your own pace",
    bonus: 100,
    sections: byTopic,
  },
]

export const planBySlug = (slug: string) => PLANS.find((p) => p.slug === slug) ?? null
export const planProblems = (plan: StudyPlan) => plan.sections.flatMap((s) => s.problems)

/** Counts by difficulty, for the plan cards. */
export function planMix(plan: StudyPlan) {
  const mix = { easy: 0, medium: 0, hard: 0 }
  for (const slug of planProblems(plan)) {
    const p = problemBySlug(slug)
    if (p) mix[p.difficulty]++
  }
  return mix
}

/** The first unsolved problem of a plan, or null when it's finished. */
export const nextInPlan = (plan: StudyPlan, solved: Set<string>) => planProblems(plan).find((s) => !solved.has(s)) ?? null
