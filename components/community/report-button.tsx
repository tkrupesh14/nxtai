"use client"

import { useState, useTransition } from "react"

import { reportAction } from "@/app/(community)/community/actions"
import { LIMITS, REPORT_REASONS } from "@/lib/community/posts"

/** "Report" with a reason; one report per person per post or comment. */
export function ReportButton({ target, id }: { target: "post" | "comment"; id: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  if (done) return <span className="text-xs text-muted-foreground">Reported — thank you</span>
  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-xs text-muted-foreground hover:text-foreground">
        Report
      </button>
      {open && (
        <form
          className="absolute left-0 z-20 mt-2 grid w-72 max-w-[calc(100vw-2rem)] gap-2 rounded-lg border bg-popover p-3 text-sm shadow-lg"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await reportAction(target, id, reason, note)
              if (r.error) setError(r.error)
              else setDone(true)
            })
          }}
        >
          <fieldset className="grid gap-1.5">
            <legend className="mb-1 font-medium">What&apos;s wrong?</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="size-4 shrink-0 accent-primary" />
                {r.label}
              </label>
            ))}
          </fieldset>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={LIMITS.note}
            rows={2}
            placeholder="Anything to add? (optional)"
            aria-label="Note for the moderators"
            className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && (
            <p role="alert" className="text-xs text-destructive-foreground">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button type="submit" disabled={!reason || pending} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">
              {pending ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      )}
    </span>
  )
}
