// Krpex Code v2: "Expected" for learners' own test cases comes from our reference JavaScript in a limited worker.
import { describe, expect, it } from "vitest"

import { problemBySlug } from "@/lib/code/problems"
import { allowCheck, expectedFor, validCases } from "@/lib/code/reference"

describe("expected answers for custom cases", () => {
  it("runs the reference solution per case and reports errors per case", async () => {
    const p = problemBySlug("two-sum")!
    expect(await expectedFor(p, [[[1, 2, 3], 5], [[4, 4], 8]])).toEqual([
      { ok: true, value: [1, 2] },
      { ok: true, value: [0, 1] },
    ])
    const bad = await expectedFor(problemBySlug("sum-of-a-list")!, [[null]])
    expect(bad?.[0]).toMatchObject({ ok: false })
  })

  it("gives up on inputs that are too slow or too big for the reference", async () => {
    const perms = problemBySlug("all-permutations")!
    const started = Date.now()
    expect(await expectedFor(perms, [["abcdefghijklmn"]])).toBeNull()
    expect(Date.now() - started).toBeLessThan(5000)
  }, 10_000)

  it("checks the shape and size of the cases, and limits how often", () => {
    const p = problemBySlug("two-sum")!
    expect(validCases(p, [[[1], 1]])).toBe(true)
    expect(validCases(p, [[[1]]])).toBe(false) // one argument short
    expect(validCases(p, [])).toBe(false)
    expect(validCases(p, Array.from({ length: 9 }, () => [[1], 1]))).toBe(false)
    expect(validCases(p, [[Array.from({ length: 2000 }, () => 1), 1]])).toBe(false)
    expect(validCases(p, "nope")).toBe(false)
    const now = 1_000_000
    for (let i = 0; i < 20; i++) expect(allowCheck("x", now)).toBe(true)
    expect(allowCheck("x", now)).toBe(false)
    expect(allowCheck("x", now + 61_000)).toBe(true)
  })
})
