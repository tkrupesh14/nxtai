import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { listParams, Pager, PostRows, SortTabs } from "@/components/community/post-list"
import { PostingNote } from "@/components/community/posting-note"
import { ProblemHeading } from "@/components/community/problem-heading"
import { IconLock } from "@/components/code/icons"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getMyCommunityStatus, getPostList } from "@/lib/community/data"
import { isSection, problemSpace, SECTION_KIND } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"

// Community 5b: a problem's community solutions or discussions (community.krpex.in/p/<slug>/solutions|discuss).

type Props = { params: Promise<{ slug: string; section: string }>; searchParams: Promise<{ sort?: string; page?: string }> }
const PER_PAGE = 20

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, section } = await params
  const p = PROBLEM_SUMMARIES.find((x) => x.slug === slug)
  if (!p || !isSection(section)) return {}
  return section === "solutions"
    ? { title: `${p.title} — community solutions`, description: `How other learners solved “${p.title}”. Solve it first to see them.`, robots: { index: false } }
    : { title: `${p.title} — discussion`, description: `Questions, hints and ideas about the coding problem “${p.title}”.` }
}

export default async function SectionPage({ params, searchParams }: Props) {
  const [{ slug, section }, sp] = await Promise.all([params, searchParams])
  const problem = PROBLEM_SUMMARIES.find((x) => x.slug === slug)
  if (!problem || !isSection(section)) notFound()
  const kind = SECTION_KIND[section]
  const { sort, page } = listParams(sp)
  const [links, user] = await Promise.all([codeLinks(), getSignedInUser()])
  const [list, status] = await Promise.all([getPostList(problemSpace(slug), kind, sort, PER_PAGE + 1, (page - 1) * PER_PAGE), user ? getMyCommunityStatus() : null])
  const base = links.community(`/p/${slug}`)
  const here = `${base}/${section}`
  const more = list.posts.length > PER_PAGE
  const posts = list.posts.slice(0, PER_PAGE)
  const login = links.main(`/login?next=${encodeURIComponent(`/community/p/${slug}/${section}`)}`)
  const solve = links.code(`/p/${slug}`)

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:py-10">
      <ProblemHeading problem={problem} section={section} counts={list.counts} base={base} solveHref={solve} />

      {list.locked ? (
        <section className="grid justify-items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          <IconLock width={22} height={22} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {list.counts.solution} community solution{list.counts.solution === 1 ? "" : "s"} — solve it to unlock
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            So nothing is spoiled, learners&apos; solutions open once you&apos;ve solved this problem (or opened its official solution).
          </p>
          <Button asChild>
            <a href={solve}>Solve it on Krpex Code</a>
          </Button>
          {!user && (
            <a href={login} className="text-sm text-primary hover:underline">
              Already solved it? Log in
            </a>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SortTabs here={here} sort={sort} />
            <PostingNote
              user={Boolean(user)}
              status={status}
              loginHref={login}
              accountHref={links.main("/account#public-profile")}
              newHref={`${here}/new`}
              label={kind === "solution" ? "Share your solution" : "Start a discussion"}
            />
          </div>

          {posts.length === 0 ? (
            <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              {kind === "solution" ? "No community solutions yet. Solved it? Be the first to share how." : "No discussions yet. Stuck or curious? Ask the first question."}
            </p>
          ) : (
            <PostRows posts={posts} here={here} profileBase={links.community("/u/")} />
          )}

          <Pager here={here} sort={sort} page={page} more={more} />
        </>
      )}
    </main>
  )
}
