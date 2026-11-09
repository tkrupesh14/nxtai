// Krpex Code study plans (v2 Phase 4): every plan lists real problems, once each.
import { describe, expect, it } from "vitest"

import { PLANS, nextInPlan, planBySlug, planMix, planProblems } from "@/lib/code/plans"
import { PROBLEMS, problemBySlug } from "@/lib/code/problems"

describe("study plans", () => {
  it("list existing problems, each once per plan, with a bonus the XP table accepts", () => {
    expect(new Set(PLANS.map((p) => p.slug)).size).toBe(PLANS.length)
    for (const plan of PLANS) {
      const slugs = planProblems(plan)
      expect(slugs.filter((s) => !problemBySlug(s)), plan.slug).toEqual([])
      expect(new Set(slugs).size, plan.slug).toBe(slugs.length)
      expect(plan.sections.every((s) => s.problems.length > 0), plan.slug).toBe(true)
      expect(plan.bonus).toBeGreaterThan(0)
      expect(plan.bonus).toBeLessThanOrEqual(100)
    }
  })

  it("has the 30-day plan at 30 easy problems and Krpex 150 covering the whole bank", () => {
    const basics = planBySlug("python-basics-30")!
    expect(planProblems(basics)).toHaveLength(30)
    expect(planMix(basics)).toEqual({ easy: 30, medium: 0, hard: 0 })
    expect(new Set(planProblems(planBySlug("krpex-150")!))).toEqual(new Set(PROBLEMS.map((p) => p.slug)))
  })

  it("points at the first unsolved problem", () => {
    const plan = planBySlug("dynamic-programming")!
    expect(nextInPlan(plan, new Set())).toBe("fibonacci")
    expect(nextInPlan(plan, new Set(["fibonacci", "climbing-stairs"]))).toBe("min-cost-stairs")
    expect(nextInPlan(plan, new Set(planProblems(plan)))).toBeNull()
  })
})

describe("practice problems for a lesson", () => {
  it("matches the lesson's idea, easiest first for beginners", async () => {
    const { lessonTags, practiceFor } = await import("@/lib/code/practice")
    expect(lessonTags("Counting characters in strings with a dictionary")).toEqual(["String", "Hash table"])
    expect(lessonTags("Dictionaries in Python")).toEqual(["Hash table"])

    const dict = practiceFor("Dictionaries in Python\nStore key-value pairs", "beginner")
    expect(dict.tag).toBe("Hash table")
    expect(dict.problems).toHaveLength(3)
    expect(dict.problems.every((p) => p.tags.includes("Hash table") && p.difficulty === "easy")).toBe(true)

    const dp = practiceFor("Dynamic programming: memoisation and tabulation", "advanced")
    expect(dp.problems.every((p) => p.tags.includes("Dynamic programming"))).toBe(true)

    expect(practiceFor("Welcome to the course", "beginner")).toEqual({ problems: [], tag: null })
  })
})
