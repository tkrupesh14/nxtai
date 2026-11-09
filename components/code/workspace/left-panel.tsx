"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { revealSolutionAction } from "@/app/(code)/code/p/[slug]/actions"
import { DifficultyBadge } from "@/components/code/difficulty-badge"
import { CodeEditor } from "@/components/code/editor"
import { IconBulb, IconCircleCheck, IconDoc, IconFlask, IconHistory, IconKey, IconLock, IconTag } from "@/components/code/icons"
import { acceptance } from "@/components/code/problem-table"
import type { CodeLanguage } from "@/lib/code/harness"
import { XP_FOR } from "@/lib/code/xp"
import { VERDICT_LABEL } from "@/lib/code/verdict"
import { cn } from "@/lib/utils"

import { CaseView } from "./case-view"
import type { SavedSubmission, Stats, SubmitOutcome, WorkspaceProblem } from "./types"

export type LeftTab = "description" | "solution" | "submissions" | "result"

const json = (v: unknown) => JSON.stringify(v).replace(/,(?=\S)/g, ", ").replace(/:(?=\S)/g, ": ")
const LANG_LABEL: Record<CodeLanguage, string> = { python: "Python", javascript: "JavaScript" }

export function LeftPanel({
  tab,
  setTab,
  problem,
  statement,
  stats,
  solved,
  revealed,
  setRevealed,
  daily,
  signedIn,
  loginHref,
  problemsHref,
  submissions,
  submitOutcome,
  onLoadCode,
}: {
  tab: LeftTab
  setTab: (t: LeftTab) => void
  problem: WorkspaceProblem
  statement: React.ReactNode
  stats: Stats | null
  solved: boolean
  revealed: boolean
  setRevealed: (v: boolean) => void
  daily: boolean
  signedIn: boolean
  loginHref: string
  problemsHref: string
  submissions: SavedSubmission[]
  submitOutcome: SubmitOutcome | null
  onLoadCode: (lang: CodeLanguage, code: string) => void
}) {
  const tabs: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
    { id: "description", label: "Description", icon: <IconDoc width={15} height={15} /> },
    { id: "solution", label: "Solution", icon: <IconKey width={15} height={15} /> },
    { id: "submissions", label: "Submissions", icon: <IconHistory width={15} height={15} /> },
  ]
  if (submitOutcome) tabs.push({ id: "result", label: "Result", icon: <IconFlask width={15} height={15} /> })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div role="tablist" aria-label="Problem" className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-muted/40 px-1.5 py-1 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
              tab === t.id ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn(tab === t.id && t.id === "result" && submitOutcome?.summary.verdict === "accepted" && "text-teal-600 dark:text-teal-400")}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {tab === "description" && (
          <Description problem={problem} statement={statement} stats={stats} solved={solved} revealed={revealed} daily={daily} signedIn={signedIn} problemsHref={problemsHref} />
        )}
        {tab === "solution" && <Solution problem={problem} solved={solved} revealed={revealed} setRevealed={setRevealed} signedIn={signedIn} />}
        {tab === "submissions" && <Submissions submissions={submissions} signedIn={signedIn} loginHref={loginHref} onLoadCode={onLoadCode} />}
        {tab === "result" && submitOutcome && <Result outcome={submitOutcome} problem={problem} signedIn={signedIn} loginHref={loginHref} onSolution={() => setTab("solution")} />}
      </div>
    </div>
  )
}

function Description({
  problem,
  statement,
  stats,
  solved,
  revealed,
  daily,
  signedIn,
  problemsHref,
}: {
  problem: WorkspaceProblem
  statement: React.ReactNode
  stats: Stats | null
  solved: boolean
  revealed: boolean
  daily: boolean
  signedIn: boolean
  problemsHref: string
}) {
  const [hintsOpen, setHintsOpen] = useState(0)
  const rate = acceptance(stats ?? undefined)
  const xp = XP_FOR[problem.difficulty] * (daily ? 2 : 1)
  return (
    <article className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {problem.number}. {problem.title}
        </h1>
        {solved && (
          <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400">
            Solved <IconCircleCheck width={15} height={15} />
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <DifficultyBadge difficulty={problem.difficulty} />
        <a href="#topics" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground hover:text-foreground">
          <IconTag width={12} height={12} /> Topics
        </a>
        <a href="#hints" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground hover:text-foreground">
          <IconBulb width={12} height={12} /> Hint
        </a>
        <span className="ml-auto text-muted-foreground">
          {revealed && !solved ? "No XP (solution opened)" : solved ? "" : `${xp} XP${daily ? " · problem of the day" : ""}`}
        </span>
      </div>

      <div className="lesson-prose mt-4 text-[15px]">{statement}</div>

      <div className="mt-5 space-y-4">
        {problem.tests.slice(0, problem.samples).map((t, i) => (
          <div key={i}>
            <p className="text-sm font-semibold">Example {i + 1}</p>
            <div className="mt-1.5 border-l-2 border-border pl-3 font-mono text-[13px] leading-relaxed">
              <div>
                <span className="font-sans font-semibold">Input: </span>
                {problem.params.map((name, j) => `${name} = ${json(t.args[j])}`).join(", ")}
              </div>
              <div>
                <span className="font-sans font-semibold">Output: </span>
                {json(t.expected)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Values are written in JSON: <code>true</code> / <code>false</code> / <code>null</code> are <code>True</code> / <code>False</code> / <code>None</code> in Python.
        {problem.unordered && " The answer's items can be in any order."}
      </p>

      <div className="mt-6 divide-y border-y text-sm">
        <section id="topics" className="py-3">
          <p className="flex items-center gap-2 font-medium">
            <IconTag width={14} height={14} /> Topics
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <Link key={t} href={`${problemsHref}?tag=${encodeURIComponent(t)}`} className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-muted/70 hover:text-primary">
                {t}
              </Link>
            ))}
          </div>
        </section>
        <section id="hints" className="py-3">
          <p className="flex items-center gap-2 font-medium">
            <IconBulb width={14} height={14} /> Hints
          </p>
          <ol className="mt-2 space-y-2">
            {problem.hints.slice(0, hintsOpen).map((h, i) => (
              <li key={i} className="rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] leading-relaxed">
                <span className="font-medium">Hint {i + 1}. </span>
                <HintText text={h} />
              </li>
            ))}
          </ol>
          {hintsOpen < problem.hints.length && (
            <button type="button" onClick={() => setHintsOpen((n) => n + 1)} className="mt-2 text-[13px] font-medium text-primary hover:underline">
              {hintsOpen === 0 ? "Show a hint" : "Show the next hint"} ({hintsOpen + 1} of {problem.hints.length})
            </button>
          )}
          {hintsOpen > 0 && <p className="mt-2 text-xs text-muted-foreground">Hints never cost XP.</p>}
        </section>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Accepted" value={stats ? stats.accepted.toLocaleString("en-IN") : "—"} />
        <Stat label="Submissions" value={stats ? stats.submissions.toLocaleString("en-IN") : "—"} />
        <Stat label="Acceptance" value={rate === null ? "—" : `${(rate * 100).toFixed(1)}%`} />
      </dl>
      {stats && stats.solvers > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Solved by {stats.solvers.toLocaleString("en-IN")} learner{stats.solvers === 1 ? "" : "s"}
        </p>
      )}
      {!signedIn && <p className="mt-4 text-center text-xs text-muted-foreground">Log in to save your code and earn XP.</p>}
    </article>
  )
}

/** Hints may contain `code`. */
function HintText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="rounded bg-background/70 px-1 font-mono text-[12px]">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function Solution({
  problem,
  solved,
  revealed,
  setRevealed,
  signedIn,
}: {
  problem: WorkspaceProblem
  solved: boolean
  revealed: boolean
  setRevealed: (v: boolean) => void
  signedIn: boolean
}) {
  const [code, setCode] = useState<{ python: string; javascript: string } | null>(null)
  const [lang, setLang] = useState<CodeLanguage>("python")
  const [failed, setFailed] = useState(false)
  const [pending, start] = useTransition()
  const costsXp = signedIn && !solved && !revealed

  function open() {
    setFailed(false)
    start(async () => {
      const r = await revealSolutionAction(problem.slug)
      if ("error" in r) return setFailed(true)
      setCode(r)
      setRevealed(true)
    })
  }

  if (!code)
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted">
          <IconLock />
        </span>
        <h2 className="mt-4 font-semibold">Official solution</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {costsXp
            ? `Try the hints first. If you open the solution now, you can still solve this problem for practice, but it won't give XP (${XP_FOR[problem.difficulty]} XP).`
            : solved
              ? "You've solved this one. Compare your answer with ours."
              : "Try the hints on the Description tab first — working it out yourself is how it sticks."}
        </p>
        <button
          type="button"
          onClick={open}
          disabled={pending}
          className={cn(
            "mt-5 inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-opacity disabled:opacity-60",
            costsXp ? "border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {pending ? "Opening…" : costsXp ? "Show the solution (no XP)" : "Show the solution"}
        </button>
        {failed && <p className="mt-3 text-sm text-destructive-foreground">Couldn&apos;t open it. Try again in a moment.</p>}
      </div>
    )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        {(["python", "javascript"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={cn("rounded-md px-2.5 py-1 text-[13px] font-medium", lang === l ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
        {!solved && revealed && <span className="ml-auto text-xs text-muted-foreground">This problem no longer gives XP.</span>}
      </div>
      <div className="min-h-[12rem] flex-1">
        <CodeEditor value={code[lang]} language={lang} readOnly label={`Official ${LANG_LABEL[lang]} solution`} />
      </div>
    </div>
  )
}

function Submissions({
  submissions,
  signedIn,
  loginHref,
  onLoadCode,
}: {
  submissions: SavedSubmission[]
  signedIn: boolean
  loginHref: string
  onLoadCode: (lang: CodeLanguage, code: string) => void
}) {
  const [open, setOpen] = useState<number | null>(null)
  if (!signedIn)
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">
        <a href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </a>{" "}
        to keep your submissions.
      </p>
    )
  if (submissions.length === 0) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">No submissions yet. Press Submit when your code passes the examples.</p>
  const shown = submissions.find((s) => s.id === open)
  if (shown)
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-sm">
          <button type="button" onClick={() => setOpen(null)} className="text-muted-foreground hover:text-foreground">
            ← All submissions
          </button>
          <span className={cn("font-semibold", shown.solved ? "text-teal-600 dark:text-teal-400" : "text-destructive-foreground")}>
            {shown.solved ? "Accepted" : `Wrong answer · ${shown.passed}/${shown.total}`}
          </span>
          <button
            type="button"
            onClick={() => onLoadCode(shown.language, shown.code)}
            className="ml-auto rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
          >
            Load into editor
          </button>
        </div>
        <div className="min-h-[12rem] flex-1">
          <CodeEditor value={shown.code} language={shown.language} readOnly label="Submitted code" />
        </div>
      </div>
    )
  return (
    <table className="w-full text-sm">
      <thead className="border-b text-left text-xs text-muted-foreground">
        <tr>
          <th scope="col" className="py-2 pl-5 font-medium">
            Result
          </th>
          <th scope="col" className="py-2 font-medium">
            Language
          </th>
          <th scope="col" className="hidden py-2 font-medium sm:table-cell">
            Runtime
          </th>
          <th scope="col" className="py-2 pr-5 text-right font-medium">
            When
          </th>
        </tr>
      </thead>
      <tbody>
        {submissions.map((s) => (
          <tr key={s.id} className="group relative border-b last:border-0 hover:bg-muted/50">
            <td className="py-2.5 pl-5">
              <button type="button" onClick={() => setOpen(s.id)} className={cn("text-left font-medium after:absolute after:inset-0", s.solved ? "text-teal-600 dark:text-teal-400" : "text-destructive-foreground")}>
                {s.solved ? "Accepted" : "Wrong answer"}
              </button>
              <span className="block text-xs text-muted-foreground">
                {s.passed}/{s.total} tests{s.xp > 0 ? ` · +${s.xp} XP` : ""}
              </span>
            </td>
            <td className="py-2.5">{LANG_LABEL[s.language]}</td>
            <td className="hidden py-2.5 tabular-nums text-muted-foreground sm:table-cell">{s.runtime_ms === null ? "—" : `${s.runtime_ms} ms`}</td>
            <td className="py-2.5 pr-5 text-right text-xs text-muted-foreground">
              <time dateTime={s.created_at}>{when(s.created_at)}</time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function when(iso: string) {
  const t = Date.parse(iso)
  const mins = Math.round((Date.now() - t) / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
}

function Result({
  outcome,
  problem,
  signedIn,
  loginHref,
  onSolution,
}: {
  outcome: SubmitOutcome
  problem: WorkspaceProblem
  signedIn: boolean
  loginHref: string
  onSolution: () => void
}) {
  const { summary } = outcome
  const ok = summary.verdict === "accepted"
  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className={cn("text-xl font-semibold", ok ? "text-teal-600 dark:text-teal-400" : "text-destructive-foreground")}>{VERDICT_LABEL[summary.verdict]}</h2>
        {summary.verdict !== "error" && summary.verdict !== "missing" && summary.verdict !== "time_limit" && summary.verdict !== "stopped" && (
          <span className="text-sm text-muted-foreground">
            {summary.passed} / {summary.total} tests passed
          </span>
        )}
      </div>

      {ok && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Runtime</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{summary.runtimeMs === null ? "—" : `${summary.runtimeMs} ms`}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Language</p>
            <p className="mt-1 text-lg font-semibold">{LANG_LABEL[outcome.lang]}</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        <SaveNote outcome={outcome} signedIn={signedIn} loginHref={loginHref} />
      </div>

      {summary.verdict === "time_limit" && <p className="mt-4 text-sm">Your code ran for more than 10 seconds and was stopped. Look for a loop that never ends, or a much slower approach than needed.</p>}
      {summary.verdict === "missing" && (
        <p className="mt-4 text-sm">
          There&apos;s no function with the name from the starting code. Keep the name and the parameters as they were.
        </p>
      )}
      {summary.verdict === "error" && (
        <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-destructive/10 p-3 font-mono text-[13px] text-destructive-foreground">{outcome.errorText || "Your code stopped before the tests could run."}</pre>
      )}
      {outcome.failing && (
        <div className="mt-5">
          <p className="mb-3 text-sm font-medium">
            {outcome.failing.hidden ? `Failed on hidden test ${outcome.failing.index + 1 - problem.samples}` : `Failed on example ${outcome.failing.index + 1}`}
          </p>
          <CaseView run={outcome.failing} params={problem.params} lang={outcome.lang} />
        </div>
      )}
      {!ok && (
        <p className="mt-6 text-xs text-muted-foreground">
          Stuck? Try the hints on the Description tab, or{" "}
          <button type="button" onClick={onSolution} className="font-medium text-primary hover:underline">
            look at the solution
          </button>
          .
        </p>
      )}
    </div>
  )
}

function SaveNote({ outcome, signedIn, loginHref }: { outcome: SubmitOutcome; signedIn: boolean; loginHref: string }) {
  const { save, summary } = outcome
  if (!signedIn)
    return (
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <a href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </a>{" "}
        to save your solutions and earn XP.
      </p>
    )
  if (save === "saving") return <p className="text-sm text-muted-foreground">Saving…</p>
  if (!save) return null
  if ("error" in save)
    return (
      <p className="text-sm text-destructive-foreground">
        {save.error === "rate_limited"
          ? "That's a lot of submissions this hour. Take a short break, then submit again."
          : save.error === "sign_in"
            ? "Your sign-in has expired. Log in again to save your solution."
            : "Couldn't save this submission. Try again in a moment."}
      </p>
    )
  if (summary.verdict !== "accepted") return <p className="text-sm text-muted-foreground">Saved to your submissions.</p>
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-teal-500/10 px-3 py-2.5 text-sm">
      {save.xp > 0 ? <span className="font-semibold text-teal-700 dark:text-teal-300">+{save.xp} XP</span> : <span>Saved.</span>}
      {save.daily && <span>Problem of the day: 2× XP</span>}
      {save.firstTry && <span>First try!</span>}
      {save.revealed && <span className="text-muted-foreground">No problem XP after opening the solution.</span>}
    </div>
  )
}
