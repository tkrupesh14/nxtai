"use client"

import { useState, useTransition } from "react"

import { voteAction } from "@/app/(community)/community/actions"
import { cn } from "@/lib/utils"

/** Upvote (no downvotes). Signed-out learners get a link to log in; authors can't vote for themselves. */
export function VoteButton({
  target,
  id,
  score,
  voted,
  mine,
  loginHref,
  size = "md",
}: {
  target: "post" | "comment"
  id: string
  score: number
  voted: boolean
  mine: boolean
  loginHref: string | null
  size?: "sm" | "md"
}) {
  const [state, setState] = useState({ score, voted })
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const cls = cn(
    "inline-flex items-center gap-1 rounded-full border font-medium tabular-nums transition-colors",
    size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm",
    state.voted ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
  )
  const label = `${state.score} upvote${state.score === 1 ? "" : "s"}`
  const arrow = (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 2 11 8H1z" />
    </svg>
  )
  if (loginHref)
    return (
      <a href={loginHref} className={cls} title="Log in to upvote" aria-label={`${label}. Log in to upvote`}>
        {arrow}
        {state.score}
      </a>
    )
  if (mine)
    return (
      <span className={cn(cls, "cursor-default hover:border-border hover:text-muted-foreground")} title="Your post" aria-label={label}>
        {arrow}
        {state.score}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className={cls}
        aria-pressed={state.voted}
        aria-label={state.voted ? `${label}. Remove your upvote` : `${label}. Upvote`}
        disabled={pending}
        onClick={() => {
          const on = !state.voted
          setError(null)
          setState((s) => ({ score: s.score + (on ? 1 : -1), voted: on }))
          start(async () => {
            const r = await voteAction(target, id, on)
            if (r.error) {
              setState({ score, voted })
              setError(r.error)
            } else if (typeof r.score === "number") setState({ score: r.score, voted: on })
          })
        }}
      >
        {arrow}
        {state.score}
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive-foreground">
          {error}
        </span>
      )}
    </span>
  )
}
