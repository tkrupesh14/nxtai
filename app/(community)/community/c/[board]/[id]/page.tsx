import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { BoardHeading } from "@/components/community/board-heading"
import { ThreadView } from "@/components/community/thread-view"
import { codeLinks } from "@/lib/code/host"
import { getBoard, spaceBoard } from "@/lib/community/boards"
import { getMyCommunityStatus, getThread } from "@/lib/community/data"
import { postPath } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5c: one board discussion with its comments.

type Props = { params: Promise<{ board: string; id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getThread((await params).id)
  if (!t || t.locked) return { title: "Post not found", robots: { index: false } }
  // Indexed once someone found it useful, like problem discussions.
  return { title: t.post.title, description: !t.post.spoiler ? t.post.body.slice(0, 160) || undefined : undefined, robots: { index: t.post.score >= 1 && !t.post.spoiler } }
}

export default async function BoardThreadPage({ params }: Props) {
  const { board: slug, id } = await params
  const board = getBoard(slug)
  const t = board ? await getThread(id) : null
  if (!board || !t || t.locked) notFound()
  const links = await codeLinks()
  // Posted somewhere else: go to its real address.
  if (spaceBoard(t.post.space) !== slug) redirect(links.community(postPath(t.post.space, t.post.kind, id)))
  const user = await getSignedInUser()
  const status = user ? await getMyCommunityStatus() : null
  const here = links.community(`/c/${slug}`)

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
      <BoardHeading board={board} boardsHref={links.community("/c")} asLink={here} />
      <ThreadView
        post={t.post}
        comments={t.comments}
        here={here}
        backLabel={`All posts in ${board.title}`}
        signedIn={Boolean(user)}
        status={status}
        loginHref={links.main(`/login?next=${encodeURIComponent(`/community/c/${slug}/${id}`)}`)}
        profileBase={links.community("/u/")}
      />
    </main>
  )
}
