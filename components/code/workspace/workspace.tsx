"use client"

import { useCallback, useEffect, useState, useTransition } from "react"

import { expectedAction, submitSolutionAction } from "@/app/(code)/code/p/[slug]/actions"
import { CodeEditor } from "@/components/code/editor"
import { IconCode, IconDoc, IconFlask, IconReset } from "@/components/code/icons"
import { useRunner } from "@/components/code/use-runner"
import type { CoachAllowance, CoachTurn, FailingCase } from "@/lib/code/coach"
import { buildProgram, parseResults, starterCode, type CaseResult, type CodeLanguage, type HarnessCase } from "@/lib/code/harness"
import { knownExpected, parseCases, summarise, toDraft, type CaseDraft } from "@/lib/code/verdict"
import { cn } from "@/lib/utils"

import { CoachPanel, type CoachFailure } from "./coach-panel"
import { ConsolePanel, type ConsoleTab } from "./console-panel"
import { LeftPanel, type LeftTab } from "./left-panel"
import { TopBar } from "./top-bar"
import type { CaseRun, ExpectedInfo, ListItem, RunOutcome, SavedSubmission, Stats, SubmitOutcome, WorkspaceProblem } from "./types"
import { useSplit } from "./use-split"

const LANGS: { id: CodeLanguage; label: string }[] = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript" },
]
const LANG_KEY = "krpex-code:lang"
const FONT_KEY = "krpex-code:font"
const draftKey = (slug: string, lang: CodeLanguage) => `krpex-code:p:${slug}:${lang}`
const casesKey = (slug: string) => `krpex-code:cases:${slug}`
const MAX_CODE = 20_000
const TIME_LIMIT_MS = 10_000
// Never equal to a real answer, so a case without a known expected answer can't "pass".
const UNKNOWN = { __krpex_unknown__: true }

type MobileTab = "problem" | "code" | "tests"

const show = (v: unknown) => {
  try {
    return JSON.stringify(v) ?? String(v)
  } catch {
    return String(v)
  }
}
/** A failing test as the AI coach sees it: the input by parameter name, the expected answer and what came back. */
function toFailing(params: string[], args: unknown[], expected: unknown, result: CaseResult | null, errorText: string): FailingCase {
  return {
    input: params.map((p, i) => `${p} = ${show(args[i])}`).join(", "),
    expected: expected === undefined ? undefined : show(expected),
    got: result && !result.error && "got" in result ? show(result.got) : undefined,
    error: result?.error ?? (errorText || undefined),
    printed: result?.out || undefined,
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

/** The problem workspace: description and history on the left, editor over a test console on the right. */
export function Workspace({
  problem,
  statement,
  list,
  hrefPrefix,
  problemsHref,
  loginHref,
  accountHref,
  user,
  initialSubmissions,
  initialSolved,
  initialRevealed,
  daily,
  stats,
  initialCoach,
  coachAllowance,
}: {
  problem: WorkspaceProblem
  statement: React.ReactNode
  list: ListItem[]
  hrefPrefix: string
  problemsHref: string
  loginHref: string
  accountHref: string
  user: { initials: string; name: string } | null
  initialSubmissions: SavedSubmission[]
  initialSolved: boolean
  initialRevealed: boolean
  daily: boolean
  stats: Stats | null
  initialCoach: CoachTurn[]
  coachAllowance: CoachAllowance | null
}) {
  const signedIn = Boolean(user)
  const samples = problem.tests.slice(0, problem.samples)
  const starters: Record<CodeLanguage, string> = { python: starterCode(problem.fn, problem.params, "python"), javascript: starterCode(problem.fn, problem.params, "javascript") }
  const lastSaved = (l: CodeLanguage) => initialSubmissions.find((s) => s.language === l)?.code

  const [lang, setLang] = useState<CodeLanguage>("python")
  const [code, setCode] = useState<Record<CodeLanguage, string>>({ python: lastSaved("python") ?? starters.python, javascript: lastSaved("javascript") ?? starters.javascript })
  const [font, setFont] = useState(14)
  const [drafts, setDrafts] = useState<CaseDraft[]>(() => samples.map((t) => toDraft(t.args)))
  const [activeCase, setActiveCase] = useState(0)
  const [caseError, setCaseError] = useState<{ caseIndex: number; argIndex: number; message: string } | null>(null)
  const [leftTab, setLeftTab] = useState<LeftTab>("description")
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcase")
  const [mobileTab, setMobileTab] = useState<MobileTab>("problem")
  const [runOutcome, setRunOutcome] = useState<RunOutcome | null>(null)
  const [submitOutcome, setSubmitOutcome] = useState<SubmitOutcome | null>(null)
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [solved, setSolved] = useState(initialSolved)
  const [revealed, setRevealed] = useState(initialRevealed)
  const [phase, setPhase] = useState<"idle" | "expected" | "run" | "submit">("idle")
  const [coachTurns, setCoachTurns] = useState(initialCoach)
  const [allowance, setAllowance] = useState(coachAllowance)
  const [failure, setFailure] = useState<CoachFailure | null>(null)
  const [saving, startSaving] = useTransition()
  const runner = useRunner({ timeoutMs: TIME_LIMIT_MS })
  const outer = useSplit("krpex-code:split-x", 42, 25, 70, "x")
  const inner = useSplit("krpex-code:split-y", 62, 25, 85, "y")

  // Restore this browser's language, drafts, own test cases and font size.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY)
      if (l === "python" || l === "javascript") setLang(l)
      const draft = (x: CodeLanguage) => localStorage.getItem(draftKey(problem.slug, x))
      setCode((c) => ({ python: draft("python") ?? c.python, javascript: draft("javascript") ?? c.javascript }))
      const f = Number(localStorage.getItem(FONT_KEY))
      if (f >= 11 && f <= 22) setFont(f)
      const saved = JSON.parse(localStorage.getItem(casesKey(problem.slug)) ?? "null") as CaseDraft[] | null
      if (Array.isArray(saved) && saved.length && saved.every((d) => Array.isArray(d?.args) && d.args.length === problem.params.length && d.args.every((a) => typeof a === "string")))
        setDrafts(saved.slice(0, 8))
    } catch {}
  }, [problem.slug, problem.params.length])

  const { warm } = runner
  useEffect(() => {
    void warm(lang)
  }, [lang, warm])

  function edit(value: string) {
    setCode((c) => ({ ...c, [lang]: value }))
    store(draftKey(problem.slug, lang), value)
  }
  function pickLang(l: CodeLanguage) {
    setLang(l)
    store(LANG_KEY, l)
  }
  function changeDrafts(d: CaseDraft[]) {
    setDrafts(d)
    setCaseError(null)
    store(casesKey(problem.slug), JSON.stringify(d))
  }
  function resetCases() {
    changeDrafts(samples.map((t) => toDraft(t.args)))
    setActiveCase(0)
    try {
      localStorage.removeItem(casesKey(problem.slug))
    } catch {}
  }
  function resetCode() {
    if (code[lang] !== starters[lang] && !window.confirm("Replace your code with the starting code? Your current code in this language will be lost.")) return
    edit(starters[lang])
  }
  function loadCode(l: CodeLanguage, c: string) {
    pickLang(l)
    setCode((prev) => ({ ...prev, [l]: c }))
    store(draftKey(problem.slug, l), c)
    setMobileTab("code")
  }

  const busy = runner.state !== "idle" || phase !== "idle"

  const run = useCallback(async () => {
    if (busy) return
    const source = code[lang]
    if (source.length > MAX_CODE) return window.alert("Your code is over 20,000 characters. Shorten it to run it.")
    const parsed = parseCases(drafts)
    if (!parsed.ok) {
      setCaseError(parsed)
      setActiveCase(parsed.caseIndex)
      setConsoleTab("testcase")
      setMobileTab("tests")
      return
    }
    setCaseError(null)
    setConsoleTab("result")
    setMobileTab("tests")
    setRunOutcome(null)

    // Expected answers: known for unchanged examples, from our reference solution for the learner's own cases.
    const expected: ExpectedInfo[] = parsed.cases.map((args) => {
      const k = knownExpected(args, samples)
      return k.found ? { known: true, value: k.value } : { known: false, reason: "Working it out…" }
    })
    const unknown = expected.map((e, i) => (e.known ? -1 : i)).filter((i) => i >= 0)
    if (unknown.length) {
      setPhase("expected")
      const r = await expectedAction(problem.slug, unknown.map((i) => parsed.cases[i])).catch(() => ({ error: "too_slow" as const }))
      unknown.forEach((i, k) => {
        if ("expected" in r) {
          const e = r.expected[k]
          expected[i] = e.ok ? { known: true, value: e.value } : { known: false, reason: "This input doesn't fit the problem, so there's no expected answer." }
        } else {
          expected[i] = {
            known: false,
            reason:
              r.error === "rate_limited"
                ? "Too many custom runs in a minute — the expected answer will be back shortly."
                : r.error === "too_slow"
                  ? "This input is too big to work out the expected answer."
                  : "Couldn't work out the expected answer for this input.",
          }
        }
      })
    }
    setPhase("run")
    const cases: HarnessCase[] = parsed.cases.map((args, i) => ({ args, expected: expected[i].known ? (expected[i] as { value: unknown }).value : UNKNOWN }))
    const end = await runner.run(lang, buildProgram(lang, source, problem.fn, cases, problem.unordered))
    const result = parseResults(end.stdout)
    const runs: CaseRun[] = parsed.cases.map((args, i) => ({ args, expected: expected[i], result: result.kind === "results" ? (result.results[i] ?? null) : null }))
    // Cases without an expected answer don't count towards the verdict.
    const counted = result.kind === "results" ? { kind: "results" as const, results: result.results.filter((_, i) => expected[i].known) } : result
    const runSummary = summarise(end.status, counted, counted.kind === "results" ? counted.results.length : cases.length)
    setRunOutcome({ lang, cases: runs, summary: runSummary, errorText: end.stderr.trim() })
    // The first failing case (with a known expected answer), or the whole run's error, for the AI coach.
    const bad = runs.find((r) => r.expected.known && r.result && !r.result.ok)
    if (bad) setFailure({ lang, code: source, failing: toFailing(problem.params, bad.args, (bad.expected as { value: unknown }).value, bad.result, "") })
    else if (runSummary.verdict === "error" || runSummary.verdict === "time_limit" || runSummary.verdict === "missing")
      setFailure({ lang, code: source, failing: toFailing(problem.params, runs[0]?.args ?? [], undefined, null, end.stderr.trim() || (runSummary.verdict === "time_limit" ? "Time limit exceeded: the code ran for over 10 seconds." : "The function from the starting code is missing.")) })
    else if (runSummary.verdict === "accepted") setFailure(null)
    setActiveCase((a) => Math.min(a, runs.length - 1))
    setPhase("idle")
  }, [busy, code, lang, drafts, samples, problem.slug, problem.fn, problem.params, problem.unordered, runner])

  const submit = useCallback(async () => {
    if (busy || saving) return
    const source = code[lang]
    if (source.length > MAX_CODE) return window.alert("Your code is over 20,000 characters. Shorten it to submit.")
    setPhase("submit")
    setSubmitOutcome(null)
    setLeftTab("result")
    setMobileTab("problem")
    const end = await runner.run(lang, buildProgram(lang, source, problem.fn, problem.tests, problem.unordered))
    const result = parseResults(end.stdout)
    const summary = summarise(end.status, result, problem.tests.length)
    const f = summary.firstFail
    const failing =
      f !== null && result.kind === "results"
        ? { index: f, hidden: f >= problem.samples, args: problem.tests[f].args, expected: { known: true as const, value: problem.tests[f].expected }, result: result.results[f] }
        : null
    const willSave = signedIn && result.kind === "results"
    setSubmitOutcome({ lang, summary, failing, errorText: end.stderr.trim(), save: willSave ? "saving" : null })
    if (failing) setFailure({ lang, code: source, failing: toFailing(problem.params, failing.args, failing.expected.value, failing.result, "") })
    else if (summary.verdict === "error" || summary.verdict === "time_limit" || summary.verdict === "missing")
      setFailure({ lang, code: source, failing: toFailing(problem.params, problem.tests[0].args, problem.tests[0].expected, null, end.stderr.trim() || (summary.verdict === "time_limit" ? "Time limit exceeded: the code ran for over 10 seconds." : "The function from the starting code is missing.")) })
    else if (summary.verdict === "accepted") setFailure(null)
    setPhase("idle")
    if (!willSave || result.kind !== "results") return
    startSaving(async () => {
      const save = await submitSolutionAction(problem.slug, lang, source, summary.passed, summary.runtimeMs)
      setSubmitOutcome((o) => (o ? { ...o, save } : o))
      if (!("error" in save)) {
        if (save.solved) setSolved(true)
        setSubmissions((s) => [
          {
            id: save.id,
            language: lang,
            code: source,
            passed: summary.passed,
            total: summary.total,
            solved: save.solved,
            xp: save.xp,
            runtime_ms: summary.runtimeMs === null ? null : Math.round(summary.runtimeMs),
            created_at: new Date().toISOString(),
          },
          ...s,
        ])
      }
    })
  }, [busy, saving, code, lang, problem, signedIn, runner])

  // Shortcuts anywhere on the page: Ctrl/⌘ + ' runs, Ctrl/⌘ + Enter submits (the editor handles its own).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement | null)?.closest?.(".cm-editor")) return
      if (e.key === "'") {
        e.preventDefault()
        void run()
      } else if (e.key === "Enter") {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [run, submit])

  const runState =
    phase === "expected" ? "Working out expected answers…" : runner.state === "loading" ? "Starting…" : runner.state === "running" ? "Running…" : ""

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted/40">
      <TopBar
        list={list}
        current={problem.slug}
        hrefPrefix={hrefPrefix}
        problemsHref={problemsHref}
        loginHref={loginHref}
        accountHref={accountHref}
        user={user}
        busy={busy}
        saving={saving}
        onRun={() => void run()}
        onSubmit={() => void submit()}
        onStop={runner.stop}
      />

      {/* Phones: one panel at a time. */}
      <div role="tablist" aria-label="Workspace" className="mx-2 mb-1.5 grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-muted p-1 lg:hidden">
        {(
          [
            ["problem", "Problem", <IconDoc key="i" width={15} height={15} />],
            ["code", "Code", <IconCode key="i" width={15} height={15} />],
            ["tests", "Tests", <IconFlask key="i" width={15} height={15} />],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mobileTab === id}
            onClick={() => setMobileTab(id)}
            className={cn("inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium", mobileTab === id ? "bg-background shadow-sm" : "text-muted-foreground")}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div ref={outer.container} className="flex min-h-0 flex-1 gap-0 px-2 pb-2" style={{ "--left": `${outer.size}%` } as React.CSSProperties}>
        <section aria-label="Problem" className={cn("min-h-0 min-w-0 flex-1 lg:w-[var(--left)] lg:flex-none", mobileTab === "problem" ? "flex flex-col" : "hidden lg:flex lg:flex-col")}>
          <LeftPanel
            tab={leftTab}
            setTab={setLeftTab}
            problem={problem}
            statement={statement}
            stats={stats}
            solved={solved}
            revealed={revealed}
            setRevealed={setRevealed}
            daily={daily}
            signedIn={signedIn}
            loginHref={loginHref}
            problemsHref={problemsHref}
            submissions={submissions}
            submitOutcome={submitOutcome}
            onLoadCode={loadCode}
            coach={
              <CoachPanel
                slug={problem.slug}
                lang={lang}
                code={code[lang]}
                failure={failure}
                solved={solved}
                signedIn={signedIn}
                loginHref={loginHref}
                turns={coachTurns}
                setTurns={setCoachTurns}
                allowance={allowance}
                setAllowance={setAllowance}
              />
            }
          />
        </section>

        <div {...outer.handleProps} aria-label="Resize the problem and code panels" className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center outline-none lg:flex">
          <span className="h-8 w-1 rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
        </div>

        <div
          ref={inner.container}
          className={cn("min-h-0 min-w-0 flex-1 flex-col", mobileTab === "problem" ? "hidden lg:flex" : "flex")}
          style={{ "--top": `${inner.size}%` } as React.CSSProperties}
        >
          <section aria-label="Code" className={cn("min-h-0 flex-col overflow-hidden rounded-lg border bg-card lg:h-[var(--top)] lg:flex-none", mobileTab === "code" ? "flex flex-1" : "hidden lg:flex")}>
            <div className="flex shrink-0 items-center gap-2 border-b bg-muted/40 px-2 py-1">
              <label>
                <span className="sr-only">Language</span>
                <select value={lang} onChange={(e) => pickLang(e.target.value as CodeLanguage)} className="h-7 cursor-pointer rounded-md bg-transparent px-1.5 text-[13px] font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50">
                  {LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <span className="hidden text-xs text-muted-foreground sm:inline">Auto-saved in this browser</span>
              <div className="ml-auto flex items-center gap-1">
                <label>
                  <span className="sr-only">Font size</span>
                  <select
                    value={font}
                    onChange={(e) => {
                      setFont(Number(e.target.value))
                      store(FONT_KEY, e.target.value)
                    }}
                    className="h-7 cursor-pointer rounded-md bg-transparent px-1 text-xs text-muted-foreground outline-none hover:bg-muted"
                  >
                    {[12, 13, 14, 15, 16, 18, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}px
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={resetCode} title="Back to the starting code" aria-label="Reset to the starting code" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <IconReset width={14} height={14} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1" style={{ "--code-font": `${font}px` } as React.CSSProperties}>
              <CodeEditor value={code[lang]} language={lang} onChange={edit} onRun={() => void run()} onSubmit={() => void submit()} label={`${lang === "python" ? "Python" : "JavaScript"} solution`} />
            </div>
          </section>

          <div {...inner.handleProps} aria-label="Resize the code and console panels" className="group hidden h-2 shrink-0 cursor-row-resize items-center justify-center outline-none lg:flex">
            <span className="h-1 w-8 rounded-full bg-border transition-colors group-hover:bg-primary group-focus-visible:bg-primary" />
          </div>

          <section aria-label="Test cases" className={cn("min-h-0 flex-1 flex-col", mobileTab === "tests" ? "flex" : "hidden lg:flex")}>
            <ConsolePanel
              tab={consoleTab}
              setTab={setConsoleTab}
              problem={problem}
              drafts={drafts}
              setDrafts={changeDrafts}
              active={activeCase}
              setActive={setActiveCase}
              caseError={caseError}
              outcome={runOutcome}
              running={phase === "expected" || phase === "run"}
              runState={runState}
              onResetCases={resetCases}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
