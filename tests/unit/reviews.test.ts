import { describe, expect, it } from "vitest"

import { average, GenerateReviewLessonSchema, reviewLessonArgs, ReviewSchema } from "@/lib/teach/reviews"

describe("reviews", () => {
  it("needs every rating from 1 to 5 and non-empty notes", () => {
    const ok = { accuracy: 5, clarity: 4, level_fit: 3, overall: 4, comment: "", block_notes: [{ block: 0, note: "x", suggestion: "" }] }
    expect(ReviewSchema.safeParse(ok).success).toBe(true)
    expect(ReviewSchema.safeParse({ ...ok, overall: 0 }).success).toBe(false)
    expect(ReviewSchema.safeParse({ ...ok, block_notes: [{ block: 0, note: " ", suggestion: "" }] }).success).toBe(false)
  })

  it("writes sample lessons from the topic only, in the chosen language", () => {
    const input = GenerateReviewLessonSchema.parse({ title: "Projectile motion", objective: "", level: "JEE / NEET preparation", language: "hi" })
    const args = reviewLessonArgs(input)
    expect(args).toMatchObject({ categoryId: "science", lessonTitle: "Projectile motion", language: "hi", sourceText: null })
    expect(args.objective).toMatch(/Projectile motion/)
  })

  it("averages to one decimal", () => {
    expect(average([])).toBeNull()
    expect(average([4, 5, 5])).toBe(4.7)
  })
})
