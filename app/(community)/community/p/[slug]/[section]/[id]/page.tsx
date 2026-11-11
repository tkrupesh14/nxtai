import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { ProblemHeading } from "@/components/community/problem-heading"
import { ThreadView } from "@/components/community/thread-view"
import { IconLock } from "@/components/code/icons"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getMyCommunityStatus, getPostList, getThread } from "@/lib/community/data"
import { isSection, KIND_SECTION, problemSpace, spaceProblem } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5b: one solution or discussion with its comments.

type Props = { params: Promise<{ slug: string; section: string; id: string }> }

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

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
      <ProblemHeading problem={problem} section={section} counts={list.counts} base={base} solveHref={solve} />
      <ThreadView
        post={t.post}
        comments={t.comments}
        here={here}
        backLabel={`All ${section === "solutions" ? "solutions" : "discussions"}`}
        signedIn={Boolean(user)}
        status={status}
        loginHref={login}
        profileBase={profileBase}
      />
    </main>
  )
}
