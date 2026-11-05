"use client"

import { useActionState, useState } from "react"

import { deleteAccount, updateLearning, updateName, type FormState } from "@/app/(learn)/account/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { LEVEL_LABELS, STYLE_LABELS, TIMELINE_LABELS } from "@/lib/learning/labels"
import { createClient } from "@/lib/supabase/client"

const selectClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Status({ state, saved = "Saved." }: { state: FormState; saved?: string }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm text-destructive-foreground">
        {state.error}
      </p>
    )
  if (state.ok)
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {saved}
      </p>
    )
  return null
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateName, {})
  return (
    <form action={action} className="grid gap-2">
      <Label htmlFor="full_name">Name</Label>
      <div className="flex gap-2">
        <Input id="full_name" name="full_name" defaultValue={name} maxLength={80} required autoComplete="name" />
        <Button type="submit" variant="outline" disabled={pending} loading={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <Status state={state} />
    </form>
  )
}

export function LearningForm({
  values,
}: {
  values: { level: string; background: string | null; hours_per_week: number | null; learning_style: string | null; timeline: string | null; language: string | null }
}) {
  const [state, action, pending] = useActionState(updateLearning, {})
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="background">Your background</Label>
        <Textarea id="background" name="background" defaultValue={values.background ?? ""} rows={3} maxLength={1000} />
        <p className="text-xs text-muted-foreground">Your professors use this to pick examples you relate to.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="level">Usual starting level</Label>
          <select id="level" name="level" defaultValue={values.level} className={selectClass}>
            {Object.entries(LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="learning_style">How you like to learn</Label>
          <select id="learning_style" name="learning_style" defaultValue={values.learning_style ?? "mixed"} className={selectClass}>
            {Object.entries(STYLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hours_per_week">Hours per week</Label>
          <Input id="hours_per_week" name="hours_per_week" type="number" min={1} max={80} defaultValue={values.hours_per_week ?? 5} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="language">Teaching language for new courses</Label>
          <select id="language" name="language" defaultValue={values.language === "hi" ? "hi" : "en"} className={selectClass}>
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timeline">Usual timeline</Label>
          <select id="timeline" name="timeline" defaultValue={values.timeline ?? "1_month"} className={selectClass}>
            {Object.entries(TIMELINE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} loading={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
        <Status state={state} saved="Saved. New lessons will use these." />
      </div>
    </form>
  )
}

/** Runs in the browser like sign-in, so Supabase rate limits apply per learner. */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [state, setState] = useState<FormState>({})
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setState({ error: "Use at least 8 characters." })
    if (!/[a-z]/i.test(password) || !/\d/.test(password)) return setState({ error: "Use a mix of letters and numbers." })
    if (password !== confirm) return setState({ error: "The two passwords don't match." })
    setPending(true)
    const { error } = await createClient().auth.updateUser({ password })
    setPending(false)
    if (error) {
      const msg =
        error.code === "same_password"
          ? "That's already your password."
          : error.code === "weak_password"
            ? "Please choose a stronger password."
            : error.code === "reauthentication_needed"
              ? "For security, sign out and sign in again, then change your password."
              : "Couldn't change your password. Please try again."
      return setState({ error: msg })
    }
    setPassword("")
    setConfirm("")
    setState({ ok: true })
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="new-password">{hasPassword ? "New password" : "Password"}</Label>
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-password">Confirm</Label>
          <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={72} required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">At least 8 characters, with letters and numbers.</p>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending} loading={pending}>
          {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </Button>
        <Status state={state} saved={hasPassword ? "Password changed." : "Password set. You can now log in with your email too."} />
      </div>
    </form>
  )
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, {})
  const [typed, setTyped] = useState("")
  return (
    <form action={action} className="grid gap-3">
      <Label htmlFor="confirm-delete">
        Type <span className="font-mono font-semibold">DELETE</span> to confirm
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input id="confirm-delete" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="max-w-48" />
        <Button type="submit" variant="destructive" disabled={pending || typed !== "DELETE"} loading={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
      <Status state={state} />
    </form>
  )
}
