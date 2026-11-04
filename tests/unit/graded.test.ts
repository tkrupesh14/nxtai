import { describe, expect, it } from "vitest"

import { gradedQuestionsText, matchesGraded, revealsAnswer } from "@/lib/learning/graded"

const quiz = [{ question: "Which force keeps the Moon in orbit around the Earth?", options: ["Friction", "Gravity", "Magnetism", "Tension"] }]

describe("revealsAnswer", () => {
  it.each([
    "The correct answer is B.",
    "So the right option would be gravity.",
    "Answer: C",
    "answer is (2)",
    "Option B is correct because…",
    "(C) is right.",
    "D is the correct one.",
    "You should pick B here.",
    "Go with (A).",
    "इसका सही उत्तर B है।",
  ])("flags %j", (reply) => expect(revealsAnswer(reply)).toBe(true))

  it.each([
    "Think about what pulls objects towards the Earth. Which option describes that?",
    "The answer is a force that acts at a distance; which of the four fits that?",
    "Gravity is a force between any two masses.",
    "Pick a similar example: a ball on a string.",
    "Let's check each option against Newton's law.",
  ])("allows %j", (reply) => expect(revealsAnswer(reply)).toBe(false))
})

describe("matchesGraded", () => {
  it("spots a pasted or reworded quiz question", () => {
    expect(matchesGraded("Which force keeps the moon in orbit around earth??", quiz)).toBe(true)
    expect(matchesGraded("what force keeps the Moon in its orbit around the Earth", quiz)).toBe(true)
  })
  it("ignores unrelated questions", () => {
    expect(matchesGraded("Why is the sky blue?", quiz)).toBe(false)
    expect(matchesGraded("orbit", quiz)).toBe(false)
  })
})

describe("gradedQuestionsText", () => {
  it("lists questions and options but never answers", () => {
    const text = gradedQuestionsText([{ question: "2 + 2?", options: ["3", "4"] }], quiz)
    expect(text).toContain("Practice 1: 2 + 2?")
    expect(text).toContain("Quiz 1: Which force keeps the Moon")
    expect(text).toContain("(B) Gravity")
    expect(text).not.toMatch(/answer/i)
  })
})
