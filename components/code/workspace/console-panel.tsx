"use client"

import { IconCheck, IconFlask, IconPlus, IconReset, IconTerminal, IconX } from "@/components/code/icons"
import { MAX_CASES } from "@/lib/code/limits"
import { VERDICT_LABEL, type CaseDraft } from "@/lib/code/verdict"
import { cn } from "@/lib/utils"

import { CaseView } from "./case-view"
import type { RunOutcome, WorkspaceProblem } from "./types"

export type ConsoleTab = "testcase" | "result"

export function ConsolePanel({
  tab,
  setTab,
  problem,
  drafts,
  setDrafts,
  active,
  setActive,
  caseError,
  outcome,
  running,
  runState,
  onResetCases,
}: {
  tab: ConsoleTab
  setTab: (t: ConsoleTab) => void
  problem: WorkspaceProblem
  drafts: CaseDraft[]
  setDrafts: (d: CaseDraft[]) => void
  active: number
  setActive: (i: number) => void
  caseError: { caseIndex: number; argIndex: number; message: string } | null
  outcome: RunOutcome | null
  running: boolean
  runState: string
  onResetCases: () => void
}) {
  function edit(i: number, j: number, text: string) {
    setDrafts(drafts.map((d, k) => (k === i ? { args: d.args.map((a, m) => (m === j ? text : a)) } : d)))
  }
  function add() {
    if (drafts.length >= MAX_CASES) return
    const copy = drafts[active] ?? drafts[0]
    setDrafts([...drafts, { args: [...copy.args] }])
    setActive(drafts.length)
  }
  function remove(i: number) {
    if (drafts.length <= 1) return
    setDrafts(drafts.filter((_, k) => k !== i))
    setActive(Math.max(0, i - 1 < 0 ? 0 : active >= i ? active - 1 : active))
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      <div role="tablist" aria-label="Console" className="flex shrink-0 items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
        <TabButton active={tab === "testcase"} onClick={() => setTab("testcase")} icon={<IconTerminal width={15} height={15} />}>
          Testcase
        </TabButton>
        <TabButton active={tab === "result"} onClick={() => setTab("result")} icon={<IconFlask width={15} height={15} />}>
          Test result
        </TabButton>
        <span className="ml-auto pr-2 text-xs text-muted-foreground" aria-live="polite">
          {runState}
        </span>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "testcase" ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {drafts.map((_, i) => (
                <span key={i} className="group relative">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    className={cn(
                      "rounded-md px-3 py-1 text-[13px] font-medium",
                      active === i ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
                      caseError?.caseIndex === i && "text-destructive-foreground",
                    )}
                  >
                    Case {i + 1}
                  </button>
                  {drafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove case ${i + 1}`}
                      className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full border bg-background text-muted-foreground group-hover:flex focus-visible:flex"
                    >
                      <IconX width={10} height={10} />
                    </button>
                  )}
                </span>
              ))}
              {drafts.length < MAX_CASES && (
                <button type="button" onClick={add} aria-label="Add a test case" title="Add a test case (copies the one shown)" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <IconPlus width={15} height={15} />
                </button>
              )}
              <button type="button" onClick={onResetCases} title="Back to the examples" className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                <IconReset width={13} height={13} /> Examples
              </button>
            </div>
            {drafts[active] && (
              <div className="mt-3 space-y-3">
                {problem.params.map((p, j) => (
                  <label key={p} className="block">
                    <span className="mb-1 block font-mono text-xs text-muted-foreground">{p} =</span>
                    <textarea
                      value={drafts[active].args[j]}
                      onChange={(e) => edit(active, j, e.target.value)}
                      rows={Math.min(6, Math.max(1, Math.ceil(drafts[active].args[j].length / 60)))}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      aria-invalid={caseError?.caseIndex === active && caseError.argIndex === j}
                      className={cn(
                        "w-full resize-y rounded-lg border bg-muted/50 px-3 py-2 font-mono text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        caseError?.caseIndex === active && caseError.argIndex === j && "border-destructive",
                      )}
                    />
                    {caseError?.caseIndex === active && caseError.argIndex === j && <span className="mt-1 block text-xs text-destructive-foreground">{caseError.message}</span>}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">Change any value (JSON) or add a case — Run shows your output and the expected answer.</p>
              </div>
            )}
          </>
        ) : running ? (
          <p className="text-sm text-muted-foreground">Running…</p>
        ) : !outcome ? (
          <p className="text-sm text-muted-foreground">Press Run to try your code on the test cases.</p>
        ) : (
          <RunResult outcome={outcome} problem={problem} active={active} setActive={setActive} />
        )}
      </div>
    </div>
  )
}

function RunResult({ outcome, problem, active, setActive }: { outcome: RunOutcome; problem: WorkspaceProblem; active: number; setActive: (i: number) => void }) {
  const { summary, cases } = outcome
  const ok = summary.verdict === "accepted"
  const failedToRun = summary.verdict === "error" || summary.verdict === "missing" || summary.verdict === "time_limit" || summary.verdict === "stopped"
  const i = Math.min(active, cases.length - 1)
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className={cn("text-lg font-semibold", ok ? "text-teal-600 dark:text-teal-400" : "text-destructive-foreground")}>{VERDICT_LABEL[summary.verdict]}</h3>
        {!failedToRun && summary.runtimeMs !== null && <span className="text-xs text-muted-foreground">Runtime: {summary.runtimeMs} ms</span>}
      </div>
      {failedToRun ? (
        summary.verdict === "missing" ? (
          <p className="mt-2 text-sm">There&apos;s no function with the name from the starting code. Keep its name and parameters.</p>
        ) : summary.verdict === "time_limit" ? (
          <p className="mt-2 text-sm">Your code ran for more than 10 seconds and was stopped. Look for a loop that never ends.</p>
        ) : summary.verdict === "stopped" ? null : (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-destructive/10 p-3 font-mono text-[13px] text-destructive-foreground">{outcome.errorText || "Your code stopped before the tests could run."}</pre>
        )
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cases.map((c, k) => {
              const pass = c.result?.ok && c.expected.known
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActive(k)}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium", i === k ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60")}
                >
                  <span className={cn("inline-flex", !c.expected.known ? "text-muted-foreground" : pass ? "text-teal-600 dark:text-teal-400" : "text-destructive-foreground")} aria-hidden>
                    {!c.expected.known ? "•" : pass ? <IconCheck width={13} height={13} /> : <IconX width={13} height={13} />}
                  </span>
                  Case {k + 1}
                  <span className="sr-only">{!c.expected.known ? "(no expected answer)" : pass ? "(passed)" : "(failed)"}</span>
                </button>
              )
            })}
          </div>
          {cases[i] && (
            <div className="mt-3">
              <CaseView run={cases[i]} params={problem.params} lang={outcome.lang} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors", active ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}
    >
      {icon}
      {children}
    </button>
  )
}
