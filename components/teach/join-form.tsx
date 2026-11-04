"use client"

import { useActionState } from "react"

import { acceptInvite, type TeachResult } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"

export function JoinForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, action, pending] = useActionState<TeachResult, FormData>(acceptInvite, {})
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="token" value={token} />
      <div className="grid gap-2">
        <Label htmlFor="display_name">Your name, as learners will see it</Label>
        <Input id="display_name" name="display_name" defaultValue={defaultName} placeholder="Dr. Asha Rao" required minLength={2} maxLength={80} />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-1 size-4" />
        <span>I have read the agreement above and accept it.</span>
      </label>
      {state.message ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Joining…" : "Join as a professor"}
      </Button>
    </form>
  )
}
