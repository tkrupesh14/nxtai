"use client"

import { useActionState, useState, useTransition } from "react"

import { communityBanAction, moderateCommunityAction, profileVisibilityAction, type AdminResult } from "@/app/(learn)/admin/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"

/** Keep or remove a reported/hidden community post or comment. */
export function ModerateButtons({ target, id }: { target: "post" | "comment"; id: string }) {
  const [reason, setReason] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (action: "keep" | "remove") =>
    start(async () => {
      const r = await moderateCommunityAction(target, id, action, reason)
      setMsg(r.ok ? (action === "keep" ? "Kept" : "Removed") : (r.message ?? "Failed"))
    })
  if (msg) return <span className="text-xs text-muted-foreground">{msg}</span>
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Reason (sent if removed)" aria-label="Reason" className="h-8 w-56 text-xs" />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run("keep")}>
        Keep
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run("remove")}>
        Remove
      </Button>
    </div>
  )
}

/** With `handle`, it's for that learner only (their admin page). */
export function CommunityBanForm({ handle, banned }: { handle?: string; banned?: boolean } = {}) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(communityBanAction, {})
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {handle ? <input type="hidden" name="handle" value={handle} /> : <Input name="handle" placeholder="@handle" aria-label="Handle" required className="h-9 w-40" />}
      <select name="length" aria-label="Length" defaultValue={banned ? "0" : "7"} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="7">No posting for 7 days</option>
        <option value="30">No posting for 30 days</option>
        <option value="forever">No posting, ever</option>
        <option value="0">Lift the ban</option>
      </select>
      <Input name="reason" placeholder="Reason (kept in the log)" aria-label="Reason" maxLength={200} className="h-9 w-56" />
      <Button size="sm" type="submit" disabled={pending} loading={pending}>
        Apply
      </Button>
      {state.message && <p className={state.ok ? "w-full text-sm text-green-700 dark:text-green-400" : "w-full text-sm text-destructive-foreground"}>{state.message}</p>}
    </form>
  )
}

export function ProfileVisibilityForm({ handle, hidden }: { handle?: string; hidden?: boolean } = {}) {
  const [state, action, pending] = useActionState<AdminResult, FormData>(profileVisibilityAction, {})
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {handle ? <input type="hidden" name="handle" value={handle} /> : <Input name="handle" placeholder="@handle" aria-label="Handle" required className="h-9 w-40" />}
      <select name="hidden" aria-label="Profile" defaultValue={hidden ? "show" : "hide"} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="hide">Hide profile page</option>
        <option value="show">Show profile page again</option>
      </select>
      <Button size="sm" type="submit" disabled={pending} loading={pending}>
        Apply
      </Button>
      {state.message && <p className={state.ok ? "w-full text-sm text-green-700 dark:text-green-400" : "w-full text-sm text-destructive-foreground"}>{state.message}</p>}
    </form>
  )
}
