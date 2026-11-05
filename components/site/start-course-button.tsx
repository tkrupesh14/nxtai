"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { startCatalogCourse, type StartState } from "@/app/(site)/courses/actions"
import { Button } from "@/components/site/ui/button"

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} loading={pending}>
      {pending ? "Starting…" : label}
    </Button>
  )
}

export function StartCourseButton({ slug, label = "Start this course" }: { slug: string; label?: string }) {
  const [state, action] = useActionState<StartState, FormData>(startCatalogCourse, {})
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="slug" value={slug} />
      <Submit label={label} />
      {state.error ? (
        <p role="alert" className="max-w-sm text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
