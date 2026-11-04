"use client"

import { useState, useTransition } from "react"

import { removeMaterial, setMaterialStatus } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import type { Material } from "@/lib/teach/data"
import { languageName } from "@/lib/teach/subjects"

export function MaterialList({ materials, canPublish }: { materials: Material[]; canPublish: boolean }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (materials.length === 0) return <p className="text-sm text-muted-foreground">Nothing yet. Upload your first notes above.</p>

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
      <ul className="grid min-w-0 gap-2" aria-label="Your material">
        {materials.map((m) => (
          <li key={m.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={m.title}>
                {m.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {m.status === "published" ? "Published" : "Draft"} · {languageName(m.language)}
                {m.topic ? ` · ${m.topic}` : ""} ·{" "}
                {m.kind === "lecture"
                  ? `Lecture transcript, ${m.pages} part${m.pages === 1 ? "" : "s"}`
                  : `${m.pages} page${m.pages === 1 ? "" : "s"}${m.kind === "pdf" ? "" : " (approx.)"}`}
              </p>
            </div>
            <div className="flex gap-1">
              {m.status === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || !canPublish}
                  title={canPublish ? undefined : "You can publish once Krpex has approved your profile"}
                  onClick={() => run(() => setMaterialStatus(m.id, "published"))}
                  aria-label={`Publish ${m.title}`}
                >
                  Publish
                </Button>
              ) : (
                <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setMaterialStatus(m.id, "draft"))} aria-label={`Unpublish ${m.title}`}>
                  Unpublish
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={`Remove ${m.title}`}
                onClick={() => {
                  if (window.confirm(`Remove "${m.title}"? It's deleted for good and no longer used.`)) run(() => removeMaterial(m.id))
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
