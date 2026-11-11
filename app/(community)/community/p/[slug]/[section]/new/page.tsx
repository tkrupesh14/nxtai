import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { PostComposer } from "@/components/community/post-composer"
import { PostingNote } from "@/components/community/posting-note"
import { getMySubmissions } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getMyCommunityStatus, getThread } from "@/lib/community/data"
import { isSection, problemSpace, SECTION_KIND } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5b: write a new solution or discussion, or edit your own (?edit=<id>).

type Props = { params: Promise<{ slug: string; section: string }>; searchParams: Promise<{ edit?: string }> }

export const metadata: Metadata = { title: "New post", robots: { index: false } }

export default async function NewPostPage({ params, searchParams }: Props) {
  const [{ slug, section }, { edit }] = await Promise.all([params, searchParams])
  const problem = PROBLEM_SUMMARIES.find((x) => x.slug === slug)
  if (!problem || !isSection(section)) notFound()
  const kind = SECTION_KIND[section]
  const links = await codeLinks()
  const here = links.community(`/p/${slug}/${section}`)
  const user = await getSignedInUser()
  if (!user) redirect(links.main(`/login?next=${encodeURIComponent(`/community/p/${slug}/${section}/new`)}`))

  const heading = (title: string) => (
    <header className="grid gap-1">
      <a href={here} className="text-xs text-muted-foreground hover:text-foreground">
        ← {problem.number}. {problem.title}
      </a>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </header>
  )

  if (edit) {
    const t = await getThread(edit)
    if (!t || t.locked || !t.post.mine || t.post.space !== problemSpace(slug)) notFound()
    const p = t.post
    return (
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
        {heading("Edit your post")}
        <PostComposer
          kind={p.kind}
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
  const title = kind === "solution" ? "Share your solution" : "Start a discussion"
  const solved = kind === "solution" ? (await getMySubmissions(slug, 50)).find((s) => s.solved) : undefined
  if (!status.can_post || (kind === "solution" && !solved))
    return (
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
        {heading(title)}
        <div className="rounded-xl border bg-card p-6">
          {status.can_post ? (
            <p className="text-sm">
              Solve the problem first, then share how you did it.{" "}
              <a href={links.code(`/p/${slug}`)} className="font-medium text-primary hover:underline">
                Solve it on Krpex Code
              </a>
            </p>
          ) : (
            <PostingNote user status={status} loginHref="" accountHref={links.main("/account#public-profile")} newHref="" label="" />
          )}
        </div>
      </main>
    )

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8 md:py-10">
      {heading(title)}
      {kind === "solution" && <p className="-mt-3 text-sm text-muted-foreground">We filled in the code from your latest accepted submission. Explain the idea so others can learn from it.</p>}
      <PostComposer
        kind={kind}
        space={problemSpace(slug)}
        threadBase={`${here}/`}
        cancelHref={here}
        initial={{ title: "", body: "", code: solved?.code ?? "", language: solved?.language ?? "python", spoiler: false }}
      />
    </main>
  )
}
