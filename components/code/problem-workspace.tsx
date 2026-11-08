"use client"

import { useEffect, useState, useTransition } from "react"

import { submitSolutionAction, type SubmitResult } from "@/app/(code)/code/p/[slug]/actions"
import { CodeEditor } from "@/components/code/editor"
import { useRunner } from "@/components/code/use-runner"
import { Button } from "@/components/site/ui/button"
import { buildProgram, fnName, parseResults, show, starterCode, type CaseResult, type CodeLanguage, type HarnessResult } from "@/lib/code/harness"
import type { PublicProblem } from "@/lib/code/problems"
import { cn } from "@/lib/utils"

const LANGS: { id: CodeLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
]
const LANG_KEY = "krpex-code:lang"
const draftKey = (slug: string, lang: CodeLanguage) => `krpex-code:p:${slug}:${lang}`
const MAX_CODE = 20_000

type Outcome = { mode: "examples" | "submit"; lang: CodeLanguage; result: HarnessResult; status: "done" | "timeout" | "stopped" }

/** Editor, test results and submit for one problem. Code runs and is checked in the learner's browser. */
export function ProblemWorkspace({
  problem,
  saved,
  signedIn,
  loginHref,
}: {
  problem: PublicProblem
  /** The learner's latest submitted code per language. */
  saved: Partial<Record<CodeLanguage, string>>
  signedIn: boolean
  loginHref: string
}) {
  const starters = { python: starterCode(problem.fn, problem.params, "python"), javascript: starterCode(problem.fn, problem.params, "javascript") }
  const [lang, setLang] = useState<CodeLanguage>("python")
  const [code, setCode] = useState<Record<CodeLanguage, string>>({ python: saved.python ?? starters.python, javascript: saved.javascript ?? starters.javascript })
  const [tab, setTab] = useState<"tests" | "output">("tests")
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [saveResult, setSaveResult] = useState<SubmitResult | null>(null)
  const [saving, startSaving] = useTransition()
  const runner = useRunner({ timeoutMs: 10_000 })

  // Unsaved drafts in this browser win over the last submission; then remember the language.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY)
      if (l === "python" || l === "javascript") setLang(l)
      const draft = (x: CodeLanguage) => localStorage.getItem(draftKey(problem.slug, x))
      setCode((c) => ({ python: draft("python") ?? c.python, javascript: draft("javascript") ?? c.javascript }))
    } catch {}
  }, [problem.slug])
  const { warm } = runner
  useEffect(() => {
    void warm(lang)
  }, [lang, warm])

  function edit(value: string) {
    setCode((c) => ({ ...c, [lang]: value }))
    try {
      localStorage.setItem(draftKey(problem.slug, lang), value)
    } catch {}
  }
  function pick(l: CodeLanguage) {
    setLang(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {}
  }

  async function check(mode: "examples" | "submit") {
    const source = code[lang]
    if (source.length > MAX_CODE) {
      setOutcome({ mode, lang, status: "done", result: { kind: "none" } })
      return
    }
    setSaveResult(null)
    setOutcome(null)
    const cases = mode === "examples" ? problem.tests.slice(0, problem.samples) : problem.tests
    const end = await runner.run(lang, buildProgram(lang, source, problem.fn, cases, problem.unordered))
    const result = parseResults(end.stdout)
    setOutcome({ mode, lang, result, status: end.status })
    setTab(result.kind === "results" ? "tests" : "output")
    if (mode === "submit" && result.kind === "results" && signedIn) {
      const passed = result.results.filter((r) => r.ok).length
      startSaving(async () => setSaveResult(await submitSolutionAction(problem.slug, lang, source, passed)))
    }
  }

  const busy = runner.state !== "idle"
  const tooLong = code[lang].length > MAX_CODE

  return (
    <section aria-label="Your solution" className="flex min-h-0 flex-col gap-4">
      <div className="flex min-h-[24rem] flex-1 flex-col overflow-hidden rounded-xl border bg-card lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div role="tablist" aria-label="Language" className="flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={lang === l.id}
                onClick={() => pick(l.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  lang === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => edit(starters[lang])} className="text-xs text-muted-foreground hover:text-foreground">
              Reset
            </button>
            {busy ? (
              <Button size="sm" variant="outline" onClick={runner.stop}>
                Stop
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => void check("examples")} disabled={tooLong}>
                  ▶ Run examples
                </Button>
                <Button size="sm" onClick={() => void check("submit")} disabled={tooLong || saving}>
                  Submit
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor value={code[lang]} language={lang} onChange={edit} onRun={() => void check("examples")} label={`${LANGS.find((l) => l.id === lang)!.label} solution`} />
        </div>
      </div>

      <div className="flex min-h-56 flex-col overflow-hidden rounded-xl border bg-card lg:h-[42%] lg:flex-none">
        <div role="tablist" aria-label="Results" className="flex items-center gap-1 border-b px-2 py-1.5">
          {(["tests", "output"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium",
                tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "tests" ? "Tests" : "Output"}
            </button>
          ))}
          <span className="ml-auto pr-2 text-xs text-muted-foreground" aria-live="polite">
            {runner.state === "loading" ? "Starting…" : runner.state === "running" ? "Running tests…" : runner.ms !== null ? `${runner.ms} ms` : ""}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 text-sm">
          {tab === "tests" ? (
            <Tests problem={problem} outcome={outcome} busy={busy} tooLong={tooLong} saving={saving} saveResult={saveResult} signedIn={signedIn} loginHref={loginHref} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm" aria-live="polite">
              {runner.output.length === 0 ? (
                <span className="text-muted-foreground">What your code prints (with print / console.log) shows here.</span>
              ) : (
                runner.output.map((l, i) => (
                  <span key={i} className={cn(l.kind === "err" && "text-destructive-foreground", l.kind === "info" && "text-muted-foreground")}>
                    {l.text}
                  </span>
                ))
              )}
            </pre>
          )}
        </div>
      </div>
    </section>
  )
}

function Tests({
  problem,
  outcome,
  busy,
  tooLong,
  saving,
  saveResult,
  signedIn,
  loginHref,
}: {
  problem: PublicProblem
  outcome: Outcome | null
  busy: boolean
  tooLong: boolean
  saving: boolean
  saveResult: SubmitResult | null
  signedIn: boolean
  loginHref: string
}) {
  if (tooLong) return <p className="text-destructive-foreground">Your code is over 20,000 characters. Shorten it to run the tests.</p>
  if (busy) return <p className="text-muted-foreground">Running…</p>
  if (!outcome)
    return (
      <p className="text-muted-foreground">
        <strong className="font-medium text-foreground">Run examples</strong> checks the examples above.{" "}
        <strong className="font-medium text-foreground">Submit</strong> also runs {problem.tests.length - problem.samples} hidden tests
        {signedIn ? " and saves your solution." : "."}
      </p>
    )
  const { result, status, lang, mode } = outcome
  if (status === "timeout") return <p className="text-destructive-foreground">Your code ran for more than 10 seconds, so it was stopped. Look for a loop that never ends.</p>
  if (status === "stopped") return <p className="text-muted-foreground">Stopped.</p>
  if (result.kind === "missing")
    return (
      <p className="text-destructive-foreground">
        There&apos;s no function called <code className="font-mono">{result.name}</code>. Keep the name from the starting code.
      </p>
    )
  if (result.kind === "none")
    return <p className="text-destructive-foreground">Your code stopped before the tests could finish. See the Output tab for the error.</p>

  const passed = result.results.filter((r) => r.ok).length
  const all = passed === result.results.length
  return (
    <div className="space-y-3">
      <p className={cn("font-medium", all ? "text-emerald-600 dark:text-emerald-400" : "text-destructive-foreground")}>
        {all ? "✓ " : ""}
        {passed} of {result.results.length} {mode === "examples" ? "examples" : "tests"} passed
      </p>
      {mode === "submit" && <SubmitNote all={all} saving={saving} saveResult={saveResult} signedIn={signedIn} loginHref={loginHref} />}
      <ol className="space-y-2">
        {result.results.map((r, i) =>
          i < problem.samples ? (
            <SampleRow key={i} n={i + 1} r={r} args={problem.tests[i].args} expected={problem.tests[i].expected} call={fnName(problem.fn, lang)} lang={lang} />
          ) : (
            <li key={i} className="flex gap-2">
              <span aria-hidden className={r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive-foreground"}>
                {r.ok ? "✓" : "✗"}
              </span>
              <span>
                Hidden test {i + 1 - problem.samples} {r.ok ? "passed" : "failed"}
                {r.error && <span className="block font-mono text-xs text-destructive-foreground">{r.error}</span>}
              </span>
            </li>
          ),
        )}
      </ol>
    </div>
  )
}

function SampleRow({ n, r, args, expected, call, lang }: { n: number; r: CaseResult; args: unknown[]; expected: unknown; call: string; lang: CodeLanguage }) {
  return (
    <li className="rounded-lg border p-2.5">
      <p className="flex gap-2 font-medium">
        <span aria-hidden className={r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive-foreground"}>
          {r.ok ? "✓" : "✗"}
        </span>
        Example {n} {r.ok ? "passed" : "failed"}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
        <dt className="text-muted-foreground">Call</dt>
        <dd className="break-all">
          {call}({args.map((a) => show(a, lang)).join(", ")})
        </dd>
        <dt className="text-muted-foreground">Expected</dt>
        <dd className="break-all">{show(expected, lang)}</dd>
        <dt className="text-muted-foreground">{r.error ? "Error" : "Got"}</dt>
        <dd className={cn("break-all", !r.ok && "text-destructive-foreground")}>{r.error ?? show(r.got, lang)}</dd>
      </dl>
    </li>
  )
}

function SubmitNote({ all, saving, saveResult, signedIn, loginHref }: { all: boolean; saving: boolean; saveResult: SubmitResult | null; signedIn: boolean; loginHref: string }) {
  if (!signedIn)
    return (
      <p className="rounded-lg bg-muted/60 px-3 py-2">
        <a href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </a>{" "}
        to save your solutions and earn XP.
      </p>
    )
  if (saving) return <p className="text-muted-foreground">Saving…</p>
  if (!saveResult) return null
  if ("error" in saveResult)
    return (
      <p className="text-destructive-foreground">
        {saveResult.error === "rate_limited"
          ? "That's a lot of submissions this hour. Take a short break, then submit again."
          : saveResult.error === "sign_in"
            ? "Your sign-in has expired. Log in again to save your solution."
            : "Couldn't save your solution. Try again in a moment."}
      </p>
    )
  return (
    <p className="rounded-lg bg-primary/10 px-3 py-2">
      {all ? "Solved and saved." : "Saved. Fix the failing tests and submit again."}
      {saveResult.xp > 0 && <span className="ml-2 font-semibold text-primary">+{saveResult.xp} XP</span>}
      {saveResult.daily && all && <span className="ml-2">· Problem of the day: double XP</span>}
      {saveResult.firstTry && <span className="ml-2">· First try!</span>}
    </p>
  )
}
