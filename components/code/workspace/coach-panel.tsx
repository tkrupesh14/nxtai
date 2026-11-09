"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { coachAction } from "@/app/(code)/code/p/[slug]/actions"
import { IconBulb, IconFlask, IconSparkle, IconCircleCheck } from "@/components/code/icons"
import { coachLabel, HINT_STEPS, nextHintStep, type CoachAllowance, type CoachKind, type CoachResult, type CoachTurn, type FailingCase } from "@/lib/code/coach"
import type { CodeLanguage } from "@/lib/code/harness"
import { cn } from "@/lib/utils"

/** The last failing test, with the code that failed it (so the coach explains that code, not later edits). */
export type CoachFailure = { lang: CodeLanguage; code: string; failing: FailingCase }

export function CoachPanel({
  slug,
  lang,
  code,
  failure,
  solved,
  signedIn,
  loginHref,
  turns,
  setTurns,
  allowance,
  setAllowance,
}: {
  slug: string
  lang: CodeLanguage
  code: string
  failure: CoachFailure | null
  solved: boolean
  signedIn: boolean
  loginHref: string
  turns: CoachTurn[]
  setTurns: (f: (t: CoachTurn[]) => CoachTurn[]) => void
  allowance: CoachAllowance | null
  setAllowance: (a: CoachAllowance) => void
}) {
  const [pending, start] = useTransition()
  const [asking, setAsking] = useState<CoachKind | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const step = nextHintStep(turns)
  const hadLastHint = turns.some((t) => t.kind === "hint" && t.step === HINT_STEPS)

  useEffect(() => end.current?.scrollIntoView({ block: "end", behavior: "smooth" }), [turns.length, pending])

  function ask(kind: CoachKind) {
    setMessage(null)
    setAsking(kind)
    start(async () => {
      const r = await coachAction(slug, {
        kind,
        step: kind === "hint" ? step : 0,
        language: kind === "error" && failure ? failure.lang : lang,
        code: kind === "error" && failure ? failure.code : code,
        failing: kind === "error" ? failure?.failing : undefined,
      }).catch((): CoachResult => ({ ok: false, message: "Couldn't reach the coach. Check your connection and try again." }))
      setAsking(null)
      if (r.allowance) setAllowance(r.allowance)
      if (!r.ok) return setMessage({ text: r.message, error: true })
      setTurns((t) => (t.some((x) => x.id === r.turn.id) ? t : [...t, r.turn]))
      if (r.cached) setMessage({ text: "You asked this already — here it is again (free).", error: false })
      else if (r.paid) setMessage({ text: "Used 1 credit.", error: false })
    })
  }

  if (!signedIn)
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-primary">
          <IconSparkle />
        </span>
        <h2 className="mt-4 font-semibold">AI coach</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">Hints in three steps that never give the answer away, help with a failing test, and a review once you&apos;ve solved it.</p>
        <a href={loginHref} className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          Log in to use the coach
        </a>
      </div>
    )

  const free = allowance ? Math.max(0, allowance.daily - allowance.usedToday) : null
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">AI coach</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">AI</span>
          {allowance && (
            <span className="ml-auto text-xs text-muted-foreground" aria-live="polite">
              {free ? `${free} of ${allowance.daily} free left today` : `Free answers used · 1 credit each (${allowance.credits} left)`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <CoachButton onClick={() => ask("hint")} disabled={pending} busy={asking === "hint"} icon={<IconBulb width={14} height={14} />}>
            {hadLastHint ? `Hint ${HINT_STEPS} again (for my code now)` : step === 1 ? `Get a hint (1 of ${HINT_STEPS})` : `Next hint (${step} of ${HINT_STEPS})`}
          </CoachButton>
          <CoachButton
            onClick={() => ask("error")}
            disabled={pending || !failure}
            busy={asking === "error"}
            icon={<IconFlask width={14} height={14} />}
            title={failure ? "Explain the last failing test" : "Run or submit your code first — this explains a failing test"}
          >
            Explain my failing test
          </CoachButton>
          <CoachButton
            onClick={() => ask("review")}
            disabled={pending || !solved}
            busy={asking === "review"}
            icon={<IconCircleCheck width={14} height={14} />}
            title={solved ? "Correctness, speed, style and a cleaner version" : "Solve the problem first"}
          >
            Review my solution
          </CoachButton>
        </div>
        <p className="text-xs text-muted-foreground">
          Your code is sent to our AI provider only when you press one of these. The coach is an AI and can be wrong — check its advice by running your code.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.length === 0 && !pending && (
          <p className="py-6 text-center text-sm text-muted-foreground">Stuck? Start with hint 1 — each hint goes one step further, and none of them gives you the code.</p>
        )}
        {turns.map((t) => (
          <article key={t.id} className="rounded-lg border bg-background px-4 py-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <IconSparkle width={12} height={12} className="text-primary" /> {coachLabel(t)}
            </h3>
            <div className="lesson-prose mt-2 text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.reply}</ReactMarkdown>
            </div>
          </article>
        ))}
        {pending && <p className="text-sm text-muted-foreground">The coach is thinking…</p>}
        {message && <p className={cn("text-sm", message.error ? "text-destructive-foreground" : "text-muted-foreground")}>{message.text}</p>}
        <div ref={end} />
      </div>
    </div>
  )
}

function CoachButton({ children, icon, busy, title, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; busy: boolean }) {
  return (
    <button
      type="button"
      title={title}
      {...props}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-[13px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {busy ? "Asking…" : children}
    </button>
  )
}
