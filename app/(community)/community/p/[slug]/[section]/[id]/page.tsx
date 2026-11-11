import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { AuthorLine } from "@/components/community/author-line"
import { CommentThread } from "@/components/community/comment-thread"
import { Markdown } from "@/components/community/markdown"
import { PostOwnerActions } from "@/components/community/post-owner-actions"
import { ProblemHeading } from "@/components/community/problem-heading"
import { ReportButton } from "@/components/community/report-button"
import { Spoiler } from "@/components/community/spoiler"
import { VoteButton } from "@/components/community/vote-button"
import { IconLock } from "@/components/code/icons"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getMyCommunityStatus, getPostList, getThread } from "@/lib/community/data"
import { communityError, isSection, KIND_SECTION, problemSpace, spaceProblem } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5b: one solution or discussion with its comments.

type Props = { params: Promise<{ slug: string; section: string; id: string }> }

/** Fenced code whose fence is longer than any run of backticks inside it. */
const fenced = (code: string, lang: string | null) => {
  const run = Math.max(2, ...Array.from(code.matchAll(/`+/g), (m) => m[0].length))
  const fence = "`".repeat(run + 1)
  return `${fence}${lang ?? ""}\n${code}\n${fence}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getThread(id)
  if (!t) return { title: "Post not found", robots: { index: false } }
  const solution = t.post.kind === "solution"
  // Discussions are indexed once someone found them useful; solutions never (they're locked).
  const index = !t.locked && !solution && t.post.score >= 1 && !t.post.spoiler
  return { title: t.post.title, description: !t.locked && !t.post.spoiler ? t.post.body.slice(0, 160) || undefined : undefined, robots: { index } }
}

export default async function ThreadPage({ params }: Props) {
  const { slug, section, id } = await params
  const problem = PROBLEM_SUMMARIES.find((x) => x.slug === slug)
  if (!problem || !isSection(section)) notFound()
  const t = await getThread(id)
  if (!t) notFound()
  const links = await codeLinks()
  const realSlug = spaceProblem(t.post.space)
  // Wrong problem or section in the URL: go to the right one.
  if (realSlug !== slug || KIND_SECTION[t.post.kind] !== section) {
    if (!realSlug) notFound()
    redirect(links.community(`/p/${realSlug}/${KIND_SECTION[t.post.kind]}/${id}`))
  }
  const user = await getSignedInUser()
  const [list, status] = await Promise.all([getPostList(problemSpace(slug), t.post.kind, "top", 1), user ? getMyCommunityStatus() : null])
  const base = links.community(`/p/${slug}`)
  const here = `${base}/${section}`
  const login = links.main(`/login?next=${encodeURIComponent(`/community/p/${slug}/${section}/${id}`)}`)
  const solve = links.code(`/p/${slug}`)
  const profileBase = links.community("/u/")

  if (t.locked)
    return (
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
        <ProblemHeading problem={problem} section={section} counts={list.counts} base={base} solveHref={solve} />
        <section className="grid justify-items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          <IconLock width={22} height={22} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">“{t.post.title}” is locked until you solve the problem</h2>
          <p className="max-w-md text-sm text-muted-foreground">Community solutions open once you&apos;ve solved it (or opened its official solution).</p>
          <Button asChild>
            <a href={solve}>Solve it on Krpex Code</a>
          </Button>
          {!user && (
            <a href={login} className="text-sm text-primary hover:underline">
              Already solved it? Log in
            </a>
          )}
        </section>
      </main>
    )

  const p = t.post
  const blocked = !user ? null : status?.can_post ? null : status?.reason?.includes("need_handle") ? "Claim a handle on your account page to comment." : communityError(status?.reason ?? undefined, "You can't comment right now.")
  const body = (
    <div className="grid gap-4">
      {p.body && <Markdown>{p.body}</Markdown>}
      {p.code && <Markdown>{fenced(p.code, p.language)}</Markdown>}
    </div>
  )

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
      <ProblemHeading problem={problem} section={section} counts={list.counts} base={base} solveHref={solve} />
      <article className="grid gap-4 rounded-xl border bg-card p-5 md:p-6">
        <header className="grid gap-2">
          <a href={here} className="text-xs text-muted-foreground hover:text-foreground">
            ← All {section === "solutions" ? "solutions" : "discussions"}
          </a>
          <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <AuthorLine author={p.author} at={p.created_at} edited={Boolean(p.edited_at)} profileBase={profileBase} />
            {p.language && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{p.language === "python" ? "Python" : "JavaScript"}</span>}
          </div>
          {p.status === "hidden" && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">Hidden from others after reports, until a moderator looks at it.</p>
          )}
        </header>
        {p.spoiler ? <Spoiler>{body}</Spoiler> : body}
        <footer className="flex flex-wrap items-center gap-4 border-t pt-4">
          <VoteButton target="post" id={p.id} score={p.score} voted={p.voted} mine={p.mine} loginHref={user ? null : login} />
          {p.mine ? <PostOwnerActions id={p.id} editHref={`${here}/new?edit=${p.id}`} afterDelete={here} /> : user ? <ReportButton target="post" id={p.id} /> : null}
        </footer>
      </article>
      <CommentThread postId={p.id} comments={t.comments} blocked={blocked} loginHref={user ? null : login} profileBase={profileBase} />
    </main>
  )
}
