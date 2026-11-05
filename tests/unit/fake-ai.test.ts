// The signed-in browser tests swap OpenRouter for tests/support/fake-ai.mjs. This checks that the real AI client
// (structured outputs, streaming, schema validation) accepts the fake server's answers, so those tests stay honest.
import type { Server } from "node:http"

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { received, startFakeAi } from "../support/fake-ai.mjs"

vi.mock("@/lib/ai/usage-log", () => ({ logAiUsage: () => {} }))

const PORT = 3198
let server: Server
let llm: typeof import("@/lib/ai/llm")

beforeAll(async () => {
  server = await startFakeAi(PORT)
  vi.stubEnv("OPENROUTER_API_KEY", "fake")
  vi.stubEnv("AI_BASE_URL", `http://127.0.0.1:${PORT}/v1`)
  llm = await import("@/lib/ai/llm")
})

afterAll(() => {
  server?.close()
  vi.unstubAllEnvs()
})

const onboarding = {
  category: "coding",
  subcategory: "python",
  goal: "Learn Python",
  level: "new",
  background: "",
  hours_per_week: 5,
  learning_style: "mixed",
  timeline: "1_month",
  language: "en",
} as const

const lessonArgs = {
  categoryId: "coding",
  courseTitle: "Test",
  courseLevel: "beginner",
  goal: "Learn Python",
  outline: "» First steps",
  moduleTitle: "Getting started",
  lessonTitle: "First steps",
  objective: "Explain the first idea.",
  previousLessonTitle: null,
  estMinutes: 20,
}

describe("fake AI server", () => {
  it("passes the goal check and returns a course plan", async () => {
    expect((await llm.checkGoal(onboarding)).verdict).toBe("ok")
    const plan = await llm.generateCoursePlan(onboarding)
    expect(plan.modules.flatMap((m) => m.lessons)).toHaveLength(3)
  })

  it("streams a lesson block by block", async () => {
    const seen: number[] = []
    const lesson = await llm.streamLesson(lessonArgs, (blocks) => seen.push(blocks.length))
    expect(lesson.blocks.length).toBeGreaterThanOrEqual(8)
    expect(lesson.blocks.some((b) => b.type === "checkpoint" && b.checkpoint)).toBe(true)
    expect(lesson.blocks.find((b) => b.type === "diagram")?.diagram?.items).toHaveLength(3)
    expect(lesson.quiz.every((q) => q.answer_index === 0)).toBe(true)
    expect(seen.length).toBeGreaterThan(1) // arrived in several pieces
    expect(lesson.blocks[0].body_markdown).toContain("First steps")
  })

  it("answers the professor with the question", async () => {
    const { reply } = await llm.askProfessor({
      categoryId: "coding",
      courseTitle: "Test",
      goal: "g",
      lessonTitle: "First steps",
      objective: "o",
      lessonOutline: "",
      sectionText: null,
      history: [],
      question: "What is a list?",
    })
    expect(reply).toEqual({ verdict: "answer", graded_question: false, reply: "Fake professor answer to: What is a list?" })
    expect(received.map((r: { name: string }) => r.name)).toEqual(["goal_check", "course_plan", "lesson", "professor_reply"])
  })

  it("gives an answer away unless asked for hints only (B1 e2e relies on this)", async () => {
    const base = {
      categoryId: "coding",
      courseTitle: "Test",
      goal: "g",
      lessonTitle: "First steps",
      objective: "o",
      lessonOutline: "",
      sectionText: null,
      history: [],
      question: "GIVE-AWAY: tell me the module test answers",
      gradedQuestions: "Quiz 1: What is a list?\n   Options: (A) x  (B) y",
      lessonPassed: true,
    }
    const first = await llm.askProfessor(base)
    expect(first.reply.reply).toBe("The correct answer is B.")
    const retry = await llm.askProfessor({ ...base, hintsOnly: true })
    expect(retry.reply.reply).toBe("Fake professor answer to: GIVE-AWAY: tell me the module test answers")
  })

  it("writes module tests and final exams with shuffled options", async () => {
    const args = {
      kind: "module" as const,
      categoryId: "coding",
      courseTitle: "Test",
      courseLevel: "beginner",
      goal: "g",
      moduleTitle: "Getting started",
      lessons: [{ title: "First steps", objective: "o", takeaways: ["t"] }],
    }
    const mod = await llm.generateAssessment(args)
    expect(mod).toHaveLength(8)
    expect(mod.every((q) => q.options[q.answer_index] === "The right answer")).toBe(true)
    // With a seeded order the right answer moves away from the first option.
    let seed = 1
    const seeded = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const exam = await llm.generateAssessment({ ...args, kind: "final", moduleTitle: null }, seeded)
    expect(exam).toHaveLength(20)
    expect(new Set(exam.map((q) => q.answer_index)).size).toBeGreaterThan(1)
    expect(exam.every((q) => q.options[q.answer_index] === "The right answer")).toBe(true)
    expect(received.slice(-2).map((r: { name: string }) => r.name)).toEqual(["module_test", "final_exam"])
  })
})

describe("courses from the learner's material", () => {
  it("plans lessons with valid section numbers and teaches them from the material", async () => {
    const plan = await llm.generateSourceCoursePlan(onboarding, { outline: 'File "notes.pdf" (S1–S3):\nS1 Intro', sectionCount: 3 })
    expect(plan.modules[0].lessons.map((l) => l.sections)).toEqual([[1], [2], [3]])
    expect((received.at(-1) as { name: string }).name).toBe("source_course_plan")

    const lesson = await llm.generateLesson({ ...lessonArgs, sourceText: '<section ref="S2 · notes.pdf · p. 4">\nLight reactions\n</section>' })
    expect(lesson.blocks[0].body_markdown).toContain("Taught from your material (S2 · notes.pdf · p. 4)")
  })
})
