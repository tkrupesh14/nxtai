import { describe, expect, it } from "vitest"

import { knownExpected, parseCases, summarise, toDraft } from "@/lib/code/verdict"

describe("verdicts", () => {
  it("names the first failure and adds up the runtime", () => {
    const ok = { ok: true, ms: 1.25 }
    expect(summarise("done", { kind: "results", results: [ok, ok] }, 2)).toEqual({ verdict: "accepted", passed: 2, total: 2, runtimeMs: 2.5, firstFail: null })
    expect(summarise("done", { kind: "results", results: [ok, { ok: false, got: 1 }, { ok: false, error: "E" }] }, 3)).toMatchObject({ verdict: "wrong", passed: 1, firstFail: 1 })
    expect(summarise("done", { kind: "results", results: [{ ok: false, error: "TypeError: x" }] }, 1)).toMatchObject({ verdict: "runtime_error", firstFail: 0 })
    expect(summarise("timeout", { kind: "none" }, 5).verdict).toBe("time_limit")
    expect(summarise("done", { kind: "none" }, 5).verdict).toBe("error")
    expect(summarise("done", { kind: "missing", name: "f" }, 5).verdict).toBe("missing")
    expect(summarise("stopped", { kind: "none" }, 5).verdict).toBe("stopped")
  })

  it("parses editable cases as JSON and says where the problem is", () => {
    expect(parseCases([toDraft([[1, 2], 3]), { args: ['"a"', " true "] }])).toEqual({ ok: true, cases: [[[1, 2], 3], ["a", true]] })
    expect(parseCases([toDraft([1]), { args: ["'a'"] }])).toMatchObject({ ok: false, caseIndex: 1, argIndex: 0 })
    expect(parseCases([{ args: ["1", ""] }])).toMatchObject({ ok: false, caseIndex: 0, argIndex: 1 })
  })

  it("knows the expected answer of an unchanged example", () => {
    const samples = [{ args: [[2, 7], 9], expected: [0, 1] }]
    expect(knownExpected([[2, 7], 9], samples)).toEqual({ found: true, value: [0, 1] })
    expect(knownExpected([[2, 8], 9], samples)).toEqual({ found: false })
  })
})
