"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { followPlanAction } from "@/app/(code)/code/(main)/plans/actions"
import { cn } from "@/lib/utils"

/** Follow / unfollow a study plan. Followed plans show on the Code home page. */
export function FollowPlanButton({ slug, following, loginHref }: { slug: string; following: boolean | null; loginHref: string }) {
  const router = useRouter()
  const [on, setOn] = useState(following)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (on === null)
    return (
      <a href={loginHref} className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium hover:bg-muted">
        Log in to follow
      </a>
    )

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        aria-pressed={on}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await followPlanAction(slug, !on)
            if (!r.ok) return setError(r.message)
            setOn(!on)
            router.refresh()
          })
        }
        className={cn(
          "inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-opacity disabled:opacity-60",
          on ? "border bg-background hover:bg-muted" : "bg-primary text-primary-foreground hover:opacity-90",
        )}
      >
        {pending ? "Saving…" : on ? "Following ✓" : "Follow this plan"}
      </button>
      {error && <p className="mt-2 text-sm text-destructive-foreground">{error}</p>}
    </div>
  )
}
