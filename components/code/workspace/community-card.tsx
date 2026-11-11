import { IconLock } from "@/components/code/icons"

// Community 5b: a problem's community solutions and discussion, shown in the workspace with links to
// community.krpex.in (community solutions stay locked until the learner solves the problem or opens ours).

export type CommunityLinks = {
  solutions: number
  discussions: number
  locked: boolean
  top: { title: string; href: string; score: number }[]
  solutionsHref: string
  discussHref: string
  shareHref: string
}

export function CommunityCard({ community, solved }: { community: CommunityLinks; solved: boolean }) {
  const locked = community.locked && !solved
  return (
    <section id="community" className="py-3">
      <p className="font-medium">Community</p>
      <ul className="mt-2 grid gap-1.5 text-[13px]">
        <li className="flex items-center justify-between gap-2">
          <a href={community.solutionsHref} className="font-medium text-primary hover:underline">
            {community.solutions} community solution{community.solutions === 1 ? "" : "s"} →
          </a>
          {locked && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <IconLock width={12} height={12} /> Solve it to unlock
            </span>
          )}
        </li>
        {!locked &&
          community.top.map((p) => (
            <li key={p.href} className="flex items-baseline gap-2 pl-3">
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">▲{p.score}</span>
              <a href={p.href} className="min-w-0 truncate hover:text-primary">
                {p.title}
              </a>
            </li>
          ))}
        <li>
          <a href={community.discussHref} className="font-medium text-primary hover:underline">
            Discussion ({community.discussions}) →
          </a>
        </li>
      </ul>
    </section>
  )
}
