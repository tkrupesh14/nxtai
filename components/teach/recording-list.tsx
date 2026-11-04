"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { removeRecording } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import type { Recording } from "@/lib/teach/data"
import { clock } from "@/lib/teach/recordings"
import { languageName } from "@/lib/teach/subjects"

const STATUS: Record<Recording["status"], string> = {
  uploading: "Uploading…",
  transcribing: "Transcribing…",
  ready: "Transcript ready to check",
  failed: "Failed",
  added: "Added to your material",
}

export function RecordingList({ recordings }: { recordings: Recording[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const working = recordings.some((r) => r.status === "uploading" || r.status === "transcribing")

  // While something is transcribing, look again every 15 seconds (the page asks Sarvam how it's going).
  useEffect(() => {
    if (!working) return
    const t = setInterval(() => router.refresh(), 15_000)
    return () => clearInterval(t)
  }, [working, router])

  if (recordings.length === 0) return <p className="text-sm text-muted-foreground">No recordings yet.</p>
  return (
    <div className="grid gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}
      <ul className="grid min-w-0 gap-2" aria-label="Your recordings">
        {recordings.map((r) => (
          <li key={r.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              {r.status === "ready" || r.status === "added" ? (
                <Link href={`/teach/recordings/${r.id}`} className="block truncate font-medium hover:underline" title={r.title}>
                  {r.title}
                </Link>
              ) : (
                <p className="truncate font-medium" title={r.title}>
                  {r.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {STATUS[r.status]} · {languageName(r.language)} · {clock(r.seconds)}
                {r.status === "failed" && r.error ? ` · ${r.error}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              {r.status === "ready" ? (
                <Button asChild size="sm">
                  <Link href={`/teach/recordings/${r.id}`} aria-label={`Check the transcript of ${r.title}`}>
                    Check transcript
                  </Link>
                </Button>
              ) : null}
              {r.status !== "uploading" && r.status !== "transcribing" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Remove recording ${r.title}`}
                  onClick={() => {
                    if (!confirm(r.status === "added" ? "Remove this transcript? The material made from it stays." : "Remove this transcript?")) return
                    start(async () => {
                      setError(null)
                      const res = await removeRecording(r.id)
                      if (!res.ok) setError(res.message ?? "Something went wrong.")
                    })
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
