"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { commentAction, deleteCommentAction, editCommentAction } from "@/app/(community)/community/actions"
import { AuthorLine } from "@/components/community/author-line"
import { Markdown } from "@/components/community/markdown"
import { ReportButton } from "@/components/community/report-button"
import { VoteButton } from "@/components/community/vote-button"
import { Button } from "@/components/site/ui/button"
import { LIMITS, type Comment } from "@/lib/community/posts"

type Props = {
  postId: string
  comments: Comment[]
  /** Null when the learner may comment; otherwise why not. */
  blocked: string | null
  loginHref: string | null
  profileBase: string
}

/** Comments under a post: one level of replies, upvotes, edit/delete your own, report others'. */
export function CommentThread({ postId, comments, blocked, loginHref, profileBase }: Props) {
  const tops = comments.filter((c) => !c.parent_id)
  const replies = (id: string) => comments.filter((c) => c.parent_id === id)
  return (
    <section aria-labelledby="comments-h" className="grid gap-5">
      <h2 id="comments-h" className="text-base font-semibold">
        {comments.filter((c) => c.status === "visible").length} comment{comments.filter((c) => c.status === "visible").length === 1 ? "" : "s"}
      </h2>
      {loginHref ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          <a href={loginHref} className="font-medium text-primary hover:underline">
            Log in
          </a>{" "}
          to join the discussion.
        </p>
      ) : blocked ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">{blocked}</p>
      ) : (
        <CommentBox postId={postId} parentId={null} placeholder="Add a comment" />
      )}
      <ul className="grid gap-4">
        {tops.map((c) => (
          <li key={c.id} className="grid gap-3">
            <CommentItem c={c} postId={postId} canReply={!blocked && !loginHref} loginHref={loginHref} profileBase={profileBase} />
            {replies(c.id).length > 0 && (
              <ul className="ml-4 grid gap-3 border-l pl-4 sm:ml-6">
                {replies(c.id).map((r) => (
                  <li key={r.id}>
                    <CommentItem c={r} postId={postId} parentId={c.id} canReply={!blocked && !loginHref} loginHref={loginHref} profileBase={profileBase} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CommentItem({ c, postId, parentId, canReply, loginHref, profileBase }: { c: Comment; postId: string; parentId?: string; canReply: boolean; loginHref: string | null; profileBase: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<"view" | "reply" | "edit">("view")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (c.status === "gone")
    return (
      <div id={`c-${c.id}`} className="scroll-mt-24 text-sm italic text-muted-foreground">
        [removed]
      </div>
    )
  return (
    <div id={`c-${c.id}`} className="grid scroll-mt-24 gap-1.5">
      <AuthorLine author={c.author} at={c.created_at} edited={c.edited} profileBase={profileBase} />
      {c.status === "hidden" && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Hidden from others while a moderator looks at it.</p>}
      {mode === "edit" ? (
        <CommentBox postId={postId} editId={c.id} initial={c.body ?? ""} onDone={() => setMode("view")} />
      ) : (
        <Markdown className="lesson-prose text-sm [&_p]:my-0">{c.body ?? ""}</Markdown>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <VoteButton target="comment" id={c.id} score={c.score} voted={c.voted} mine={c.mine} loginHref={loginHref} size="sm" />
        {canReply && mode === "view" && (
          <button type="button" onClick={() => setMode("reply")} className="text-xs text-muted-foreground hover:text-foreground">
            Reply
          </button>
        )}
        {c.mine && mode === "view" && (
          <>
            <button type="button" onClick={() => setMode("edit")} className="text-xs text-muted-foreground hover:text-foreground">
              Edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this comment?")) return
                start(async () => {
                  const r = await deleteCommentAction(c.id)
                  if (r.error) setError(r.error)
                  else router.refresh()
                })
              }}
              className="text-xs text-muted-foreground hover:text-destructive-foreground"
            >
              Delete
            </button>
          </>
        )}
        {!c.mine && !loginHref && <ReportButton target="comment" id={c.id} />}
        {error && (
          <span role="alert" className="text-xs text-destructive-foreground">
            {error}
          </span>
        )}
      </div>
      {mode === "reply" && <CommentBox postId={postId} parentId={parentId ?? c.id} placeholder={`Reply to ${c.author && !("deleted" in c.author) ? c.author.name : "this comment"}`} onDone={() => setMode("view")} autoFocus />}
    </div>
  )
}

function CommentBox({
  postId,
  parentId = null,
  editId,
  initial = "",
  placeholder,
  onDone,
  autoFocus,
}: {
  postId: string
  parentId?: string | null
  editId?: string
  initial?: string
  placeholder?: string
  onDone?: () => void
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const r = editId ? await editCommentAction(editId, body) : await commentAction(postId, parentId, body)
          if (r.error) setError(r.error)
          else {
            setBody("")
            onDone?.()
            router.refresh()
          }
        })
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={LIMITS.comment}
        rows={editId ? 3 : 2}
        required
        autoFocus={autoFocus}
        aria-label={editId ? "Edit your comment" : placeholder ?? "Comment"}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {error && (
        <p role="alert" className="text-xs text-destructive-foreground">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !body.trim()} loading={pending}>
          {editId ? "Save" : parentId ? "Reply" : "Comment"}
        </Button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
