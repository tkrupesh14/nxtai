"use client"

import { useActionState } from "react"

import { feedbackUpdateAction, type AdminResult } from "@/app/(learn)/admin/actions"
import { Button } from "@/components/site/ui/button"
import { Textarea } from "@/components/site/ui/textarea"
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/feedback/options"

/** Status and reply for one feedback report. A new reply, or marking it fixed, notifies the tester. */
export function FeedbackTriageForm({ id, status, reply }: { id: string; status: FeedbackStatus; reply: string | null }) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(feedbackUpdateAction.bind(null, id), {})
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-start">
      <select name="status" defaultValue={status} aria-label="Status" className="h-9 rounded-md border bg-background px-2 text-sm">
        {FEEDBACK_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <Textarea name="reply" defaultValue={reply ?? ""} rows={2} maxLength={2000} placeholder="Reply to the tester (optional; they get a notification)" aria-label="Reply" className="min-h-9" />
      <Button size="sm" type="submit" disabled={pending} className="h-9">
        Save
      </Button>
      {state.message && <p className={state.ok ? "text-sm text-green-700 sm:col-span-3 dark:text-green-400" : "text-sm text-destructive-foreground sm:col-span-3"}>{state.message}</p>}
    </form>
  )
}
