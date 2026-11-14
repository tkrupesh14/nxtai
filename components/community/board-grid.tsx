import { ago } from "@/lib/community/posts"
import { BOARDS, isBoardOpen, type BoardKind, type BoardStats } from "@/lib/community/boards"

/** Cards for one kind of board, with post counts and last activity. */
export function BoardGrid({ kind, heading, stats, community }: { kind: BoardKind; heading: string; stats: BoardStats[]; community: (path: string) => string }) {
  return (
    <section className="grid gap-3" aria-labelledby={`boards-${kind}`}>
      <h2 id={`boards-${kind}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BOARDS.filter((b) => b.kind === kind && isBoardOpen(b.slug, stats)).map((b) => {
          const s = stats.find((x) => x.slug === b.slug)
          return (
            <li key={b.slug} className="relative rounded-xl border bg-card p-4 hover:bg-muted/40">
              <h3 className="flex items-center gap-2 font-semibold">
                <span aria-hidden>{b.icon}</span>
                <a href={community(`/c/${b.slug}`)} className="after:absolute after:inset-0 hover:text-primary">
                  {b.title}
                </a>
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {s?.posts ? `${s.posts} post${s.posts === 1 ? "" : "s"}` : "No posts yet"}
                {s?.last_activity ? ` · active ${ago(s.last_activity)}` : ""}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
