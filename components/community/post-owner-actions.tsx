"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { deletePostAction } from "@/app/(community)/community/actions"

/** Edit / Delete for the author of a post. */
export function PostOwnerActions({ id, editHref, afterDelete }: { id: string; editHref: string; afterDelete: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-3">
      <a href={editHref} className="text-xs text-muted-foreground hover:text-foreground">
        Edit
      </a>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-destructive-foreground"
        onClick={() => {
          if (!confirm("Delete this post and its comments?")) return
          start(async () => {
            const r = await deletePostAction(id)
            if (r.error) setError(r.error)
            else {
              router.push(afterDelete)
              router.refresh()
            }
          })
        }}
      >
        Delete
      </button>
      {error && (
        <span role="alert" className="text-xs text-destructive-foreground">
          {error}
        </span>
      )}
    </span>
  )
}
