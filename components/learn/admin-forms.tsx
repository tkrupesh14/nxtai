"use client"

import { useActionState, useTransition } from "react"

import { grantAction, resolveReport } from "@/app/(learn)/admin/actions"
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
