import Link from "next/link"

import { AuthorLine } from "@/components/community/author-line"
import { cn } from "@/lib/utils"
import type { PostSummary } from "@/lib/community/posts"

// Community lists shared by problem sections and boards: sort tabs, post rows and pages.

export function SortTabs({ here, sort }: { here: string; sort: "top" | "new" }) {
  return (
    <div className="flex rounded-md border p-0.5 text-sm" role="group" aria-label="Sort">
      {(["top", "new"] as const).map((s) => (
        <Link key={s} href={`${here}${s === "new" ? "?sort=new" : ""}`} aria-current={sort === s ? "true" : undefined} className={cn("rounded px-3 py-1", sort === s ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
          {s === "top" ? "Top" : "Newest"}
        </Link>
      ))}
    </div>
  )
}

/** Score arrow + count, as shown in lists (not a button: votes happen on the thread). */
export function ScoreBox({ score, voted }: { score: number; voted?: boolean }) {
  return (
    <div className="flex w-10 shrink-0 flex-col items-center pt-0.5 text-center" aria-label={`${score} upvotes`}>
      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={voted ? "text-primary" : "text-muted-foreground"}>
        <path d="M6 2 11 8H1z" />
      </svg>
      <span className="text-sm font-semibold tabular-nums">{score}</span>
    </div>
  )
}

export function Excerpt({ excerpt, spoiler }: { excerpt: string | null; spoiler: boolean }) {
  return excerpt ? (
    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerpt}</p>
  ) : spoiler ? (
    <p className="mt-1 text-sm italic text-muted-foreground">Contains a spoiler</p>
  ) : null
}

export const languageLabel = (l: "python" | "javascript") => (l === "python" ? "Python" : "JavaScript")

export function PostRows({ posts, here, profileBase }: { posts: PostSummary[]; /** list URL; threads are `${here}/${id}` */ here: string; profileBase: string }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {posts.map((p) => (
        <li key={p.id} className="relative flex gap-4 px-5 py-4 hover:bg-muted/40">
          <ScoreBox score={p.score} voted={p.voted} />
          <div className="min-w-0 flex-1">
            <h2 className="font-medium">
              <Link href={`${here}/${p.id}`} className="after:absolute after:inset-0 hover:text-primary">
                {p.title}
              </Link>
            </h2>
            <Excerpt excerpt={p.excerpt} spoiler={p.spoiler} />
            <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <AuthorLine author={p.author} at={p.created_at} edited={p.edited} profileBase={profileBase} />
              {p.language && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{languageLabel(p.language)}</span>}
              <span className="text-xs text-muted-foreground">
                {p.comments} comment{p.comments === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Pager({ here, sort, page, more }: { here: string; sort: "top" | "new"; page: number; more: boolean }) {
  if (page <= 1 && !more) return null
  const href = (n: number) => `${here}?${new URLSearchParams({ ...(sort === "new" ? { sort } : {}), page: String(n) })}`
  return (
    <nav aria-label="Pages" className="flex justify-between text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="text-primary hover:underline">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      {more && (
        <Link href={href(page + 1)} className="text-primary hover:underline">
          Next →
        </Link>
      )}
    </nav>
  )
}

/** ?sort= and ?page= from a list page's search params. */
export function listParams(sp: { sort?: string; page?: string }) {
  return { sort: sp.sort === "new" ? ("new" as const) : ("top" as const), page: Math.max(1, Math.min(50, Number.parseInt(sp.page ?? "1", 10) || 1)) }
}
