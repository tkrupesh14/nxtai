import Link from "next/link"

/** Applications | Feedback | Activity, at the top of the admin Beta pages. */
export function BetaTabs({ current, newFeedback }: { current: "applications" | "feedback" | "activity"; newFeedback?: number }) {
  const tab = (on: boolean) => `-mb-px border-b-2 px-3 py-2 text-sm ${on ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`
  return (
    <nav aria-label="Beta" className="flex gap-1 border-b">
      <Link href="/admin/beta" aria-current={current === "applications" ? "page" : undefined} className={tab(current === "applications")}>
        Applications
      </Link>
      <Link href="/admin/beta/feedback" aria-current={current === "feedback" ? "page" : undefined} className={tab(current === "feedback")}>
        Feedback{newFeedback ? ` · ${newFeedback} new` : ""}
      </Link>
      <Link href="/admin/beta/activity" aria-current={current === "activity" ? "page" : undefined} className={tab(current === "activity")}>
        Activity
      </Link>
    </nav>
  )
}
