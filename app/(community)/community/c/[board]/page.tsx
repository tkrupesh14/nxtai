import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BoardHeading } from "@/components/community/board-heading"
import { listParams, Pager, PostRows, SortTabs } from "@/components/community/post-list"
import { PostingNote } from "@/components/community/posting-note"
import { codeLinks } from "@/lib/code/host"
import { boardSpace, getBoard } from "@/lib/community/boards"
import { getMyCommunityStatus, getPostList } from "@/lib/community/data"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5c: one board's discussions (community.krpex.in/c/<board>).

type Props = { params: Promise<{ board: string }>; searchParams: Promise<{ sort?: string; page?: string }> }
const PER_PAGE = 20

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const board = getBoard((await params).board)
  if (!board) return {}
  return {
    title: `${board.title} — community board`,
    description: board.kind === "course" ? `Learners talking about ${board.description.toLowerCase()} on Krpex.` : board.description,
  }
}

export default async function BoardPage({ params, searchParams }: Props) {
  const [{ board: slug }, sp] = await Promise.all([params, searchParams])
  const board = getBoard(slug)
  if (!board) notFound()
  const { sort, page } = listParams(sp)
  const [links, user] = await Promise.all([codeLinks(), getSignedInUser()])
  const [list, status] = await Promise.all([getPostList(boardSpace(slug), "discussion", sort, PER_PAGE + 1, (page - 1) * PER_PAGE), user ? getMyCommunityStatus() : null])
  const here = links.community(`/c/${slug}`)
  const more = list.posts.length > PER_PAGE
  const posts = list.posts.slice(0, PER_PAGE)

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
      <BoardHeading board={board} boardsHref={links.community("/c")} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SortTabs here={here} sort={sort} />
        <PostingNote
          user={Boolean(user)}
          status={status}
          loginHref={links.main(`/login?next=${encodeURIComponent(`/community/c/${slug}`)}`)}
          accountHref={links.main("/account#public-profile")}
          newHref={`${here}/new`}
          label="Start a discussion"
        />
      </div>
      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">Nothing here yet. Ask the first question or share an idea.</p>
      ) : (
        <PostRows posts={posts} here={here} profileBase={links.community("/u/")} />
      )}
      <Pager here={here} sort={sort} page={page} more={more} />
    </main>
  )
}
