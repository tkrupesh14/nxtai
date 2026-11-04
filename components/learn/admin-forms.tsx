"use client"

import { useActionState, useTransition } from "react"

import { grantAction, inviteProfessorAction, resolveReport, revokeInvite, setProfessorStatus, type InviteResult } from "@/app/(learn)/admin/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"

export function GrantForm() {
  const [state, action, pending] = useActionState(grantAction, {})
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="g-email">Learner email</Label>
          <Input id="g-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="g-credits">Credits</Label>
          <Input id="g-credits" name="credits" type="number" defaultValue={0} min={-100000} max={100000} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="g-days">Pro days</Label>
          <Input id="g-days" name="pro_days" type="number" defaultValue={0} min={0} max={3650} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="g-note">Note (optional)</Label>
        <Input id="g-note" name="note" maxLength={200} placeholder="e.g. beta tester, refund, goodwill" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Applying…" : "Apply"}
        </Button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
            {state.message}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Negative credits remove credits. Pro days add to any current Pro time.</p>
    </form>
  )
}

export function ResolveButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => resolveReport(id))}>
      {pending ? "…" : "Resolve"}
    </Button>
  )
}

export function InviteProfessorForm({ subjects }: { subjects: readonly { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<InviteResult, FormData>(inviteProfessorAction, {})
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="p-email">Professor email</Label>
          <Input id="p-email" name="email" type="email" required autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="p-subject">Subject</Label>
          <select id="p-subject" name="subject" className="h-9 rounded-md border bg-background px-3 text-sm">
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invite"}
        </Button>
      </div>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
          {state.message}
        </p>
      ) : null}
      {state.link ? (
        <div className="flex min-w-0 gap-2">
          <Input readOnly value={state.link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 font-mono text-xs" />
          <Button type="button" variant="outline" onClick={() => navigator.clipboard?.writeText(state.link!)}>
            Copy
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">The link is shown only once. It works for that email only, once, for 14 days.</p>
    </form>
  )
}

export function RevokeInviteButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => revokeInvite(id))}>
      {pending ? "…" : "Revoke"}
    </Button>
  )
}

export function ProfessorStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex gap-1">
      {status !== "approved" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => setProfessorStatus(id, "approved"))}>
          Approve
        </Button>
      ) : null}
      {status !== "suspended" ? (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Pause this professor? Their material stops being used.")) start(() => setProfessorStatus(id, "suspended"))
          }}
        >
          Pause
        </Button>
      ) : null}
    </div>
  )
}
