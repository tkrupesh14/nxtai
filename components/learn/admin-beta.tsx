"use client"

import { useActionState } from "react"

import { betaDecideAction, type AdminResult } from "@/app/(learn)/admin/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"

/** Approve (with Pro days) or decline one beta application. Approving again after a decline doesn't give Pro twice. */
export function BetaDecideForm({ userId, name, status, proGiven }: { userId: string; name: string; status: "waiting" | "approved" | "declined"; proGiven: boolean }) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(betaDecideAction.bind(null, userId), {})
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Input name="note" placeholder="Note (only admins see it)" aria-label={`Note about ${name}`} maxLength={500} className="h-9 w-full sm:w-56" />
      {status !== "approved" && !proGiven ? (
        <label className="grid gap-0.5 text-xs text-muted-foreground">
          Pro days
          <Input name="pro_days" type="number" min={0} max={365} defaultValue={30} className="h-9 w-20" />
        </label>
      ) : null}
      {status !== "approved" ? (
        <Button size="sm" type="submit" name="status" value="approved" disabled={pending} className="h-9" aria-label={`Approve ${name}`}>
          Approve
        </Button>
      ) : null}
      {status !== "declined" ? (
        <Button size="sm" type="submit" name="status" value="declined" variant="outline" disabled={pending} className="h-9" aria-label={`Decline ${name}`}>
          {status === "approved" ? "Remove from the beta" : "Decline"}
        </Button>
      ) : null}
      {state.message && <p className={state.ok ? "w-full text-sm text-green-700 dark:text-green-400" : "w-full text-sm text-destructive-foreground"}>{state.message}</p>}
    </form>
  )
}
