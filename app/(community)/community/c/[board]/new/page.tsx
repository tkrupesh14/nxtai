import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { PostComposer } from "@/components/community/post-composer"
import { PostingNote } from "@/components/community/posting-note"
import { codeLinks } from "@/lib/code/host"
import { boardSpace, getBoard } from "@/lib/community/boards"
import { getMyCommunityStatus, getThread } from "@/lib/community/data"
import { LIMITS } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5c: start a discussion on a board (?title= pre-fills it, e.g. from a lesson), or edit yours (?edit=<id>).

type Props = { params: Promise<{ board: string }>; searchParams: Promise<{ edit?: string; title?: string }> }

export const metadata: Metadata = { title: "New post", robots: { index: false } }

export default async function NewBoardPostPage({ params, searchParams }: Props) {
  const [{ board: slug }, { edit, title }] = await Promise.all([params, searchParams])
  const board = getBoard(slug)
  if (!board) notFound()
  const links = await codeLinks()
  const here = links.community(`/c/${slug}`)
  const user = await getSignedInUser()
  if (!user) {
    const next = `/community/c/${slug}/new${title ? `?title=${encodeURIComponent(title)}` : ""}`
    redirect(links.main(`/login?next=${encodeURIComponent(next)}`))
  }

  const heading = (text: string) => (
    <header className="grid gap-1">
      <a href={here} className="text-xs text-muted-foreground hover:text-foreground">
        ← {board.icon} {board.title}
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">{text}</h1>
    </header>
  )

  if (edit) {
    const t = await getThread(edit)
    if (!t || t.locked || !t.post.mine || t.post.space !== boardSpace(slug)) notFound()
    const p = t.post
    return (
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
        {heading("Edit your post")}
        <PostComposer
          kind="discussion"
          space={p.space}
          threadBase={`${here}/`}
          cancelHref={`${here}/${p.id}`}
          editId={p.id}
          initial={{ title: p.title, body: p.body, code: p.code ?? "", language: p.language ?? "python", spoiler: p.spoiler }}
        />
      </main>
    )
  }

  const status = await getMyCommunityStatus()
  if (!status.can_post)
    return (
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
        {heading("Start a discussion")}
        <div className="rounded-xl border bg-card p-6">
          <PostingNote user status={status} loginHref="" accountHref={links.main("/account#public-profile")} newHref="" label="" />
        </div>
      </main>
    )

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
      {heading("Start a discussion")}
      <PostComposer
        kind="discussion"
        space={boardSpace(slug)}
        threadBase={`${here}/`}
        cancelHref={here}
        initial={{ title: (title ?? "").replace(/\s+/g, " ").trim().slice(0, LIMITS.title), body: "", code: "", language: "python", spoiler: false }}
      />
    </main>
  )
}
