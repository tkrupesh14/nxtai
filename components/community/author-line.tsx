import Link from "next/link"

import { LevelBadge } from "@/components/community/level-badge"
import { ago, isDeleted, type AuthorCard } from "@/lib/community/posts"

/** "Asha · L4 · 2 h ago": name links to the profile when it's public. */
export function AuthorLine({ author, at, edited, profileBase, className }: { author: AuthorCard | null; at: string; edited?: boolean; /** "/u/" on community.krpex.in */ profileBase: string; className?: string }) {
  return (
    <p className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground ${className ?? ""}`}>
      {isDeleted(author) ? (
        <span className="italic">[deleted user]</span>
      ) : (
        <>
          {author.public ? (
            <Link href={`${profileBase}${author.handle}`} className="font-medium text-foreground hover:underline">
              {author.name}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{author.name}</span>
          )}
          <span>@{author.handle}</span>
          <LevelBadge level={author.level} />
        </>
      )}
      <span aria-hidden>·</span>
      <time dateTime={at} suppressHydrationWarning>
        {ago(at)}
      </time>
      {edited && <span>· edited</span>}
    </p>
  )
}
