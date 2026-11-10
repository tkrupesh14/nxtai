"use client"

import { useActionState, useState } from "react"

import { savePublicProfile } from "@/app/(learn)/account/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { BIO_MAX, NAME_MAX, handleProblem, nextHandleChange, normaliseHandle, type MyPublicProfile } from "@/lib/community/profile"

/** Community 5a: claim a handle and choose what the public page at community.krpex.in/u/<handle> shows. */
export function PublicProfileForm({ profile, defaultName, profileHref }: { profile: MyPublicProfile | null; defaultName: string; profileHref: string }) {
  const [state, action, pending] = useActionState(savePublicProfile, {})
  const [handle, setHandle] = useState(profile?.handle ?? "")
  const [bio, setBio] = useState(profile?.bio ?? "")
  const savedHandle = state.handle ?? profile?.handle
  const isPublic = state.ok ? state.isPublic : profile?.is_public
  const locked = profile ? nextHandleChange(profile.handle_changed_at) : null
  const changing = Boolean(profile) && normaliseHandle(handle) !== profile?.handle
  const problem = handle ? handleProblem(handle) : null
  const href = savedHandle ? `${profileHref}${savedHandle}` : null

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex min-w-0 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="shrink-0 pl-3 text-sm text-muted-foreground">community.krpex.in/u/</span>
          <input
            id="handle"
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))}
            required
            minLength={3}
            maxLength={20}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-help"
            aria-invalid={Boolean(problem) || undefined}
            className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
          />
        </div>
        <p id="handle-help" className={problem ? "text-xs text-destructive-foreground" : "text-xs text-muted-foreground"}>
          {problem ??
            (locked && changing
              ? `You can change your handle again on ${locked.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.`
              : "3–20 lowercase letters, numbers and _. Shown next to everything you post. You can change it once every 30 days.")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? defaultName} maxLength={NAME_MAX} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea id="bio" name="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={BIO_MAX} placeholder="Final-year CSE student learning Python and DSA" />
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {bio.length}/{BIO_MAX}
        </p>
      </div>
      <fieldset className="grid gap-3">
        <legend className="sr-only">Visibility</legend>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" name="is_public" defaultChecked={profile?.is_public ?? false} className="mt-0.5 size-4 shrink-0 accent-primary" />
          <span>
            Make my profile public
            <span className="block text-xs text-muted-foreground">Anyone can see your name, bio, level, XP, streak, solved counts, coding activity and finished study plans. Never your email.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" name="show_solves" defaultChecked={profile?.show_solves ?? false} className="mt-0.5 size-4 shrink-0 accent-primary" />
          <span>
            Also show which problems I solved recently
            <span className="block text-xs text-muted-foreground">Titles and dates only — your code is never shown.</span>
          </span>
        </label>
      </fieldset>
      {profile?.hidden && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Your profile has been hidden by a moderator. Please update your name or bio, then contact us to restore it.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || Boolean(problem) || (Boolean(locked) && changing)} loading={pending}>
          {pending ? "Saving…" : profile ? "Save profile" : "Claim handle"}
        </Button>
        {href && isPublic && !profile?.hidden && (
          <a href={href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            View your public profile
          </a>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive-foreground">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {state.isPublic ? "Saved. Your profile is public." : "Saved. Your profile is private."}
        </p>
      )}
    </form>
  )
}
