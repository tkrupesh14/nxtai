import "server-only"

import { Worker } from "node:worker_threads"

import { camel } from "@/lib/code/harness"
import { MAX_CASES } from "@/lib/code/limits"
import type { Problem } from "@/lib/code/problems"

// Krpex Code v2: "Expected" for a learner's own test cases. Only OUR reference JavaScript runs here, never the
// learner's code. It runs in a worker thread with small memory limits and a time limit, so an input that makes
// the reference slow or huge (a 15-letter word for all-permutations) only costs that worker.

const MAX_INPUT_CHARS = 4000
const TIME_LIMIT_MS = 2000

export type Expected = { ok: true; value: unknown } | { ok: false; error: string }

const WORKER = `
const { parentPort, workerData } = require("node:worker_threads")
const { code, name, cases } = workerData
const fn = new Function(code + "\\nreturn " + name)()
const out = cases.map((args) => {
  try {
    const v = fn(...JSON.parse(args))
    return { ok: true, value: v === undefined ? null : JSON.parse(JSON.stringify(v)) }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e).slice(0, 200) }
  }
})
parentPort.postMessage(out)
`

/** Checks the shape of learner-written cases: an array of argument lists, one value per parameter. */
export function validCases(problem: Pick<Problem, "params">, cases: unknown): cases is unknown[][] {
  if (!Array.isArray(cases) || cases.length === 0 || cases.length > MAX_CASES) return false
  if (!cases.every((c) => Array.isArray(c) && c.length === problem.params.length)) return false
  try {
    return JSON.stringify(cases).length <= MAX_INPUT_CHARS
  } catch {
    return false
  }
}

/** Runs the reference solution on each case. Null when it ran out of time or memory. */
export function expectedFor(problem: Problem, cases: unknown[][]): Promise<Expected[] | null> {
  return new Promise((resolve) => {
    const w = new Worker(WORKER, {
      eval: true,
      workerData: { code: problem.solution.javascript, name: camel(problem.fn), cases: cases.map((c) => JSON.stringify(c)) },
      resourceLimits: { maxOldGenerationSizeMb: 48, maxYoungGenerationSizeMb: 8, stackSizeMb: 4 },
      env: {},
    })
    let done = false
    const finish = (v: Expected[] | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      void w.terminate()
      resolve(v)
    }
    const timer = setTimeout(() => finish(null), TIME_LIMIT_MS)
    w.once("message", (m: Expected[]) => finish(m))
    w.once("error", () => finish(null))
    w.once("exit", () => finish(null))
  })
}

// A little per-visitor limit so the worker can't be used as free compute: 20 checks a minute.
const recent = new Map<string, number[]>()
export function allowCheck(who: string, now = Date.now()) {
  const list = (recent.get(who) ?? []).filter((t) => now - t < 60_000)
  if (list.length >= 20) return false
  list.push(now)
  recent.set(who, list)
  if (recent.size > 5000) recent.clear()
  return true
}
