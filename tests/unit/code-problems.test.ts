// Krpex Code problem bank (5.4 C): every reference solution passes its own tests through the same harness the
// browser runs, in both languages. JavaScript runs here the way public/code-runner.html runs it (an async
// function body); Python runs with the machine's python3.
import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"

import { buildProgram, fnName, parseResults, starterCode, type CodeLanguage, type HarnessResult } from "@/lib/code/harness"
import { PROBLEMS, TOPICS, publicProblem, type Problem } from "@/lib/code/problems"

async function runJs(program: string) {
  let out = ""
  const con = { log: (...a: unknown[]) => (out += a.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(" ") + "\n") }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  try {
    await new AsyncFunction("console", "input", "prompt", program)(con, () => null, () => null)
  } catch (e) {
    out += `error: ${e}\n`
  }
  return out
}
function runPython(program: string) {
  const r = spawnSync("python3", ["-I", "-c", program], { encoding: "utf8", timeout: 20_000 })
  return r.stdout + (r.stderr ? `error: ${r.stderr}` : "")
}
const run = async (lang: CodeLanguage, p: Problem, code: string): Promise<HarnessResult> => {
  const program = buildProgram(lang, code, p.fn, p.tests, p.unordered)
  return parseResults(lang === "python" ? runPython(program) : await runJs(program))
}
const hasPython = spawnSync("python3", ["--version"]).status === 0

describe("problem bank", () => {
  it("has unique slugs, known topics and sensible tests", () => {
    expect(new Set(PROBLEMS.map((p) => p.slug)).size).toBe(PROBLEMS.length)
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(60)
    for (const p of PROBLEMS) {
      expect(p.slug, p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(TOPICS).toContain(p.topic)
      expect(p.fn, p.slug).toMatch(/^[a-z_][a-z0-9_]*$/)
      expect(p.samples, p.slug).toBeGreaterThan(0)
      expect(p.tests.length, p.slug).toBeGreaterThan(p.samples)
      for (const t of p.tests) expect(t.args.length, p.slug).toBe(p.params.length)
      expect(p.solution.javascript, p.slug).toContain(`function ${fnName(p.fn, "javascript")}(`)
      expect(p.solution.python, p.slug).toContain(`def ${p.fn}(`)
      expect("solution" in publicProblem(p)).toBe(false)
    }
  })

  it("JavaScript reference solutions pass every test", async () => {
    const failed: unknown[] = []
    for (const p of PROBLEMS) {
      const r = await run("javascript", p, p.solution.javascript)
      if (r.kind !== "results") failed.push({ slug: p.slug, r })
      else r.results.forEach((x, i) => x.ok || failed.push({ slug: p.slug, test: i, expected: p.tests[i].expected, ...x }))
    }
    expect(failed).toEqual([])
  })

  it.skipIf(!hasPython)("Python reference solutions pass every test", async () => {
    const failed: unknown[] = []
    for (const p of PROBLEMS) {
      const r = await run("python", p, p.solution.python)
      if (r.kind !== "results") failed.push({ slug: p.slug, r })
      else r.results.forEach((x, i) => x.ok || failed.push({ slug: p.slug, test: i, expected: p.tests[i].expected, ...x }))
    }
    expect(failed).toEqual([])
  })

  it.each(["javascript", "python"] as const)("%s: starter code runs and fails, wrong answers and errors are reported", async (lang) => {
    if (lang === "python" && !hasPython) return
    const p = PROBLEMS.find((x) => x.slug === "two-sum")!
    const starter = await run(lang, p, starterCode(p.fn, p.params, lang))
    expect(starter.kind).toBe("results")
    if (starter.kind === "results") expect(starter.results.every((r) => !r.ok)).toBe(true)

    const wrong = lang === "python" ? "def two_sum(nums, target):\n    return [1, 0] if target == 9 else [0, 1]" : "function twoSum() { return [0, 1] }"
    const w = await run(lang, p, wrong)
    expect(w.kind === "results" && w.results.map((r) => r.ok)).toEqual(lang === "python" ? [false, false, true, false, false] : [true, false, true, false, false])

    const boom = lang === "python" ? "def two_sum(nums, target):\n    return nums[99]" : "function twoSum(nums) { return nums.x.y }"
    const b = await run(lang, p, boom)
    expect(b.kind === "results" && b.results[0].error).toMatch(lang === "python" ? /IndexError/ : /TypeError/)

    expect(await run(lang, p, lang === "python" ? "x = 1" : "const x = 1")).toEqual({ kind: "missing", name: fnName("two_sum", lang) })
  })

  it("checks types strictly but numbers loosely, and dictionaries by content", async () => {
    const p = PROBLEMS.find((x) => x.slug === "even-or-odd")!
    const ones = await run("javascript", p, "function isEven(n) { return n % 2 === 0 ? 1 : 0 }")
    expect(ones.kind === "results" && ones.results.some((r) => r.ok)).toBe(false)
    const temp = PROBLEMS.find((x) => x.slug === "celsius-to-fahrenheit")!
    const close = await run("javascript", temp, "function toFahrenheit(c) { return c * 1.8 + 32.0000000001 }")
    expect(close.kind === "results" && close.results.every((r) => r.ok)).toBe(true)
    const subsets = PROBLEMS.find((x) => x.slug === "all-subsets")!
    const anyOrder = await run("javascript", subsets, "function subsets(nums) { const out = [[]]; for (const n of nums) for (const s of [...out]) out.push([...s, n]); return out.reverse() }")
    expect(anyOrder.kind === "results" && anyOrder.results.every((r) => r.ok)).toBe(true)
  })
})
