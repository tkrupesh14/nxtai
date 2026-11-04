"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { removeLesson, setLessonStatus } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import type { LessonSummary } from "@/lib/teach/data"
import { languageName } from "@/lib/teach/subjects"

export function LessonList({ lessons, canPublish }: { lessons: LessonSummary[]; canPublish: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (lessons.length === 0) return <p className="text-sm text-muted-foreground">No lessons yet.</p>
  const run = (fn: () => Promise<{ ok?: boolean; message?: string }>) =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.message ?? "Something went wrong.")
    })

  return (
    <div className="grid gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}
      <ul className="grid min-w-0 gap-2" aria-label="Your lessons">
        {lessons.map((l) => (
          <li key={l.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <Link href={`/teach/lessons/${l.id}`} className="block truncate font-medium hover:underline" title={l.title}>
                {l.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {l.status === "published" ? "Published" : "Draft"} · {languageName(l.language)}
                {l.topic ? ` · ${l.topic}` : ""} · {l.blocks} block{l.blocks === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-1">
              {l.status === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || !canPublish}
                  title={canPublish ? undefined : "You can publish once Krpex has approved your profile"}
                  onClick={() => run(() => setLessonStatus(l.id, "published"))}
                  aria-label={`Publish lesson ${l.title}`}
                >
                  Publish
                </Button>
              ) : (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setLessonStatus(l.id, "draft"))} aria-label={`Unpublish lesson ${l.title}`}>
                  Unpublish
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={`Remove lesson ${l.title}`}
                onClick={() => {
                  if (window.confirm(`Remove "${l.title}"? It's deleted for good.`)) run(() => removeLesson(l.id))
                }}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
