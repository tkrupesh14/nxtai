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
    expect(reply).toEqual({ verdict: "answer", reply: "Fake professor answer to: What is a list?" })
    expect(received.map((r: { name: string }) => r.name)).toEqual(["goal_check", "course_plan", "lesson", "professor_reply"])
  })
})
