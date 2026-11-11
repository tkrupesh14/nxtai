import { AuthorLine } from "@/components/community/author-line"
import { Excerpt, ScoreBox } from "@/components/community/post-list"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getBoard, spaceBoard } from "@/lib/community/boards"
import { postPath, spaceProblem, type FeedPost } from "@/lib/community/posts"
import { cn } from "@/lib/utils"

/** Where a feed post lives: "🙋 Help" or "1. Two Sum", with the address of that board or problem discussion. */
export function feedPlace(space: string): { label: string; path: string } | null {
  const board = getBoard(spaceBoard(space))
  if (board) return { label: `${board.icon} ${board.title}`, path: `/c/${board.slug}` }
  const problem = PROBLEM_SUMMARIES.find((p) => p.slug === spaceProblem(space))
  return problem ? { label: `${problem.number}. ${problem.title}`, path: `/p/${problem.slug}/discuss` } : null
}

/**
 * The latest active discussions. `community` turns a community.krpex.in path into a link for this host.
 * compact: one line per post (for the Code home and /learn).
 */
export function FeedList({ posts, community, compact }: { posts: FeedPost[]; community: (path: string) => string; compact?: boolean }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {posts.map((p) => {
        const place = feedPlace(p.space)
        return (
          <li key={p.id} className={cn("relative flex gap-4 hover:bg-muted/40", compact ? "px-4 py-3" : "px-5 py-4")}>
            {!compact && <ScoreBox score={p.score} />}
            <div className="min-w-0 flex-1">
              {place && (
                <a href={community(place.path)} className="relative z-10 text-xs font-medium text-muted-foreground hover:text-foreground">
                  {place.label}
                </a>
              )}
              <h3 className={cn("font-medium", compact && "truncate text-sm")}>
                <a href={community(postPath(p.space, "discussion", p.id))} className="after:absolute after:inset-0 hover:text-primary">
                  {p.title}
                </a>
              </h3>
              {!compact && <Excerpt excerpt={p.excerpt} spoiler={p.spoiler} />}
              <div className={cn("relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1", compact ? "mt-1" : "mt-2")}>
                <AuthorLine author={p.author} at={p.created_at} profileBase={community("/u/")} />
                <span className="text-xs text-muted-foreground">
                  {p.comments} {p.comments === 1 ? "reply" : "replies"}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
