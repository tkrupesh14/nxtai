// Krpex Code (5.4 C): turns a learner's code + a problem's tests into one program for the in-browser runner.
// The program calls the learner's function once per test and prints one marker line with the results as JSON.
// Grading happens in the learner's browser, so it can be faked; XP limits in migration 028 keep that small.

export type CodeLanguage = "python" | "javascript"
export type HarnessCase = { args: unknown[]; expected: unknown }
export type CaseResult = { ok: boolean; got?: unknown; error?: string }
export type HarnessResult =
  | { kind: "results"; results: CaseResult[] }
  | { kind: "missing"; name: string }
  | { kind: "none" } // the program didn't get as far as printing results (error, timeout, too much output)

export const RESULT_MARK = "__krpex_results__:"

/** two_sum → twoSum */
export const camel = (name: string) => name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
export const fnName = (name: string, lang: CodeLanguage) => (lang === "python" ? name : camel(name))

export function starterCode(fn: string, params: string[], lang: CodeLanguage) {
  if (lang === "python") return `def ${fn}(${params.join(", ")}):\n    # Write your code here\n    pass\n`
  return `function ${camel(fn)}(${params.map(camel).join(", ")}) {\n  // Write your code here\n}\n`
}

const IDENT = /^[a-z_][a-z0-9_]*$/

export function buildProgram(lang: CodeLanguage, code: string, fn: string, cases: HarnessCase[], unordered = false) {
  if (!IDENT.test(fn)) throw new Error(`bad function name: ${fn}`)
  const json = JSON.stringify(JSON.stringify(cases)) // a quoted string literal, valid in both languages
  if (lang === "python") {
    return `${code}

import json as _kx_json
def _kx_eq(a, b, top=False):
    if ${unordered ? "True" : "False"} and top and isinstance(a, list) and isinstance(b, list):
        key = lambda v: _kx_json.dumps(v, sort_keys=True)
        a, b = sorted(a, key=key), sorted(b, key=key)
    if isinstance(a, bool) or isinstance(b, bool):
        return isinstance(a, bool) and isinstance(b, bool) and a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= 1e-6 * max(1, abs(b))
    if isinstance(b, list):
        return isinstance(a, list) and len(a) == len(b) and all(_kx_eq(x, y) for x, y in zip(a, b))
    if isinstance(b, dict):
        return isinstance(a, dict) and set(a) == set(b) and all(_kx_eq(a[k], b[k]) for k in b)
    return a == b
def _kx_run():
    fn = globals().get(${JSON.stringify(fn)})
    if not callable(fn):
        print(${JSON.stringify(RESULT_MARK)} + _kx_json.dumps({"missing": ${JSON.stringify(fn)}}))
        return
    out = []
    for c in _kx_json.loads(${json}):
        try:
            got = fn(*c["args"])
        except Exception as e:
            out.append({"ok": False, "error": type(e).__name__ + ": " + str(e)})
            continue
        try:
            got = _kx_json.loads(_kx_json.dumps(got))
        except (TypeError, ValueError):
            out.append({"ok": False, "error": "returned a " + type(got).__name__ + ", which can't be checked"})
            continue
        out.append({"ok": _kx_eq(got, c["expected"], True), "got": got})
    print(${JSON.stringify(RESULT_MARK)} + _kx_json.dumps({"results": out}))
_kx_run()
`
  }
  const name = camel(fn)
  return `${code}
;await (async () => {
  const __kxEq = (a, b, top) => {
    if (${unordered} && top && Array.isArray(a) && Array.isArray(b)) {
      const key = (v) => JSON.stringify(v)
      a = [...a].sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0))
      b = [...b].sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0))
    }
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b))
    if (Array.isArray(b)) return Array.isArray(a) && a.length === b.length && b.every((v, i) => __kxEq(a[i], v))
    if (b && typeof b === "object") {
      if (!a || typeof a !== "object" || Array.isArray(a)) return false
      const ka = Object.keys(a), kb = Object.keys(b)
      return ka.length === kb.length && kb.every((k) => Object.hasOwn(a, k) && __kxEq(a[k], b[k]))
    }
    return a === b
  }
  const __kxFn = typeof ${name} === "function" ? ${name} : undefined
  if (!__kxFn) return console.log(${JSON.stringify(RESULT_MARK)} + JSON.stringify({ missing: ${JSON.stringify(name)} }))
  const __kxOut = []
  for (const c of JSON.parse(${json})) {
    let got
    try {
      got = await __kxFn(...c.args)
    } catch (e) {
      __kxOut.push({ ok: false, error: (e && e.name ? e.name + ": " : "") + (e && e.message !== undefined ? e.message : String(e)) })
      continue
    }
    try {
      got = got === undefined ? null : JSON.parse(JSON.stringify(got))
    } catch {
      __kxOut.push({ ok: false, error: "returned something that can't be checked" })
      continue
    }
    __kxOut.push({ ok: __kxEq(got, c.expected, true), got })
  }
  console.log(${JSON.stringify(RESULT_MARK)} + JSON.stringify({ results: __kxOut }))
})()
`
}

/** Finds the results line in everything the program printed. */
export function parseResults(stdout: string): HarnessResult {
  const at = stdout.lastIndexOf(RESULT_MARK)
  if (at < 0) return { kind: "none" }
  const line = stdout.slice(at + RESULT_MARK.length).split("\n")[0]
  try {
    const data = JSON.parse(line) as { results?: CaseResult[]; missing?: string }
    if (data.missing) return { kind: "missing", name: data.missing }
    if (Array.isArray(data.results)) return { kind: "results", results: data.results }
  } catch {}
  return { kind: "none" }
}

/** Short, readable value for the results table. */
export function show(value: unknown, lang: CodeLanguage, max = 120) {
  let s: string
  if (lang === "python") s = pyRepr(value)
  else s = value === undefined ? "undefined" : JSON.stringify(value)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return "None"
  if (v === true) return "True"
  if (v === false) return "False"
  if (typeof v === "string") return JSON.stringify(v).replace(/^"|"$/g, "'").replace(/\\"/g, '"')
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`
  if (typeof v === "object") return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${pyRepr(k)}: ${pyRepr(x)}`).join(", ")}}`
  return String(v)
}
