import { describe, expect, it } from "vitest"

import { assessmentPrompt } from "@/lib/ai/llm"
import { courseLanguage, isCourseLanguage, languageRule } from "@/lib/learning/language"

describe("languageRule", () => {
  it("adds nothing for English courses", () => {
    expect(languageRule("en", "lesson")).toBe("")
    expect(languageRule(null, "chat")).toBe("")
  })

  it("asks for Hindi in Devanagari, with English terms recognisable", () => {
    const rule = languageRule("hi", "lesson")
    expect(rule).toMatch(/taught in Hindi/)
    expect(rule).toMatch(/Devanagari/)
    expect(rule).toContain("त्वरण (acceleration)")
    expect(rule).toMatch(/the quiz/)
    expect(languageRule("hi", "chat")).toMatch(/If the learner writes in English, answer in English/)
    expect(languageRule("hi", "plan")).toMatch(/welcome message/)
  })

  it("only accepts the two languages", () => {
    expect(isCourseLanguage("hi")).toBe(true)
    expect(isCourseLanguage("fr")).toBe(false)
    expect(courseLanguage("fr")).toBe("en")
    expect(courseLanguage(null)).toBe("en")
  })
})

describe("prompts", () => {
  it("module tests for Hindi courses are written in Hindi", () => {
    const args = {
      kind: "module" as const,
      categoryId: "science",
      courseTitle: "गति",
      courseLevel: "beginner",
      goal: "Physics",
      moduleTitle: "Speed",
      lessons: [{ title: "Speed", objective: "o", takeaways: [] }],
    }
    expect(assessmentPrompt({ ...args, language: "hi" })).toMatch(/<language>[\s\S]*every question, option and explanation/)
    expect(assessmentPrompt(args)).not.toMatch(/<language>/)
  })
})
