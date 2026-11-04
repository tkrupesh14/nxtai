"use client"

import { useActionState } from "react"

import { updateProfile, type TeachResult } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import type { Professor } from "@/lib/teach/data"
import { TEACH_LANGUAGES } from "@/lib/teach/subjects"

export function ProfileForm({ professor }: { professor: Professor }) {
  const [state, action, pending] = useActionState<TeachResult, FormData>(updateProfile, {})
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="display_name">Name</Label>
          <Input id="display_name" name="display_name" defaultValue={professor.display_name} required minLength={2} maxLength={80} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={professor.title ?? ""} placeholder="Associate Professor of Physics" maxLength={80} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="institution">Institution</Label>
        <Input id="institution" name="institution" defaultValue={professor.institution ?? ""} placeholder="College or university" maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bio">Short bio (shown to learners)</Label>
        <Textarea id="bio" name="bio" defaultValue={professor.bio ?? ""} rows={4} maxLength={1200} placeholder="What you teach, and how you like to teach it." />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Languages you teach in</legend>
        <div className="flex flex-wrap gap-4">
          {TEACH_LANGUAGES.map((l) => (
            <label key={l.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="languages" value={l.id} defaultChecked={professor.languages.includes(l.id)} className="size-4" />
              {l.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="teaching_style">How you teach (the AI follows this)</Label>
        <Textarea
          id="teaching_style"
          name="teaching_style"
          defaultValue={professor.teaching_style ?? ""}
          rows={5}
          maxLength={2000}
          placeholder="e.g. I start every topic with an everyday observation, derive formulas instead of stating them, always check units, and end with a JEE-style problem. I warn students about sign mistakes in kinematics."
        />
        <p className="text-xs text-muted-foreground">
          How you explain, the examples you like, how you check understanding, mistakes you warn about.
        </p>
      </div>
      <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
        <input type="checkbox" name="listing_requested" defaultChecked={professor.listing_requested} className="mt-0.5 size-4" />
        <span>
          <span className="block font-medium">Show my AI professor to learners</span>
          <span className="block text-muted-foreground text-pretty">
            Learners can then choose &ldquo;{professor.display_name} (AI)&rdquo;, an AI that teaches from your published material and
            this description, and see your name, title, institution and bio. Krpex checks it before it goes live. Untick to
            hide it straight away.
          </span>
        </span>
      </label>
      <div className="grid gap-2">
        <Label htmlFor="credentials">Qualifications and experience (seen only by Krpex)</Label>
        <Textarea
          id="credentials"
          name="credentials"
          defaultValue={professor.credentials ?? ""}
          rows={3}
          maxLength={1200}
          placeholder="Degrees, years teaching, courses taught, a link to your faculty page"
        />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive-foreground"}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
