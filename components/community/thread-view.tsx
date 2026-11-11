import { AuthorLine } from "@/components/community/author-line"
import { CommentThread } from "@/components/community/comment-thread"
import { Markdown } from "@/components/community/markdown"
import { PostOwnerActions } from "@/components/community/post-owner-actions"
import { languageLabel } from "@/components/community/post-list"
import { ReportButton } from "@/components/community/report-button"
import { Spoiler } from "@/components/community/spoiler"
import { VoteButton } from "@/components/community/vote-button"
import { communityError, type Comment, type MyCommunityStatus, type Post } from "@/lib/community/posts"

/** Fenced code whose fence is longer than any run of backticks inside it. */
export const fenced = (code: string, lang: string | null) => {
  const run = Math.max(2, ...Array.from(code.matchAll(/`+/g), (m) => m[0].length))
  const fence = "`".repeat(run + 1)
  return `${fence}${lang ?? ""}\n${code}\n${fence}`
}

/** One open post with votes, owner actions or Report, and its comments. Shared by problem sections and boards. */
export function ThreadView({
  post: p,
  comments,
  here,
  backLabel,
  signedIn,
  status,
  loginHref,
  profileBase,
}: {
  post: Post
  comments: Comment[]
  /** The list this post belongs to; the post is `${here}/${id}`. */
  here: string
  backLabel: string
  signedIn: boolean
  status: MyCommunityStatus | null
  loginHref: string
  profileBase: string
}) {
  const blocked = !signedIn
    ? null
    : status?.can_post
      ? null
      : status?.reason?.includes("need_handle")
        ? "Claim a handle on your account page to comment."
        : communityError(status?.reason ?? undefined, "You can't comment right now.")
  const body = (
    <div className="grid gap-4">
      {p.body && <Markdown>{p.body}</Markdown>}
      {p.code && <Markdown>{fenced(p.code, p.language)}</Markdown>}
    </div>
  )

  return (
    <>
      <article className="grid gap-4 rounded-xl border bg-card p-5 md:p-6">
        <header className="grid gap-2">
          <a href={here} className="text-xs text-muted-foreground hover:text-foreground">
            ← {backLabel}
          </a>
          <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <AuthorLine author={p.author} at={p.created_at} edited={Boolean(p.edited_at)} profileBase={profileBase} />
            {p.language && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{languageLabel(p.language)}</span>}
          </div>
          {p.status === "hidden" && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">Hidden from others after reports, until a moderator looks at it.</p>
          )}
        </header>
        {p.spoiler ? <Spoiler>{body}</Spoiler> : body}
        <footer className="flex flex-wrap items-center gap-4 border-t pt-4">
          <VoteButton target="post" id={p.id} score={p.score} voted={p.voted} mine={p.mine} loginHref={signedIn ? null : loginHref} />
          {p.mine ? <PostOwnerActions id={p.id} editHref={`${here}/new?edit=${p.id}`} afterDelete={here} /> : signedIn ? <ReportButton target="post" id={p.id} /> : null}
        </footer>
      </article>
      <CommentThread postId={p.id} comments={comments} blocked={blocked} loginHref={signedIn ? null : loginHref} profileBase={profileBase} />
    </>
  )
}
