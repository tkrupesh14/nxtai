import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AuthorLine } from "@/components/community/author-line"
import { PostingNote } from "@/components/community/posting-note"
import { ProblemHeading } from "@/components/community/problem-heading"
import { IconLock } from "@/components/code/icons"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES } from "@/lib/code/problems"
import { getMyCommunityStatus, getPostList } from "@/lib/community/data"
import { isSection, problemSpace, SECTION_KIND } from "@/lib/community/posts"
import { getSignedInUser } from "@/lib/supabase/profile"
import { cn } from "@/lib/utils"

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
  const sort = sp.sort === "new" ? "new" : "top"
  const page = Math.max(1, Math.min(50, Number.parseInt(sp.page ?? "1", 10) || 1))
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
            <div className="flex rounded-md border p-0.5 text-sm" role="group" aria-label="Sort">
              {(["top", "new"] as const).map((s) => (
                <Link key={s} href={`${here}${s === "new" ? "?sort=new" : ""}`} aria-current={sort === s ? "true" : undefined} className={cn("rounded px-3 py-1", sort === s ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
                  {s === "top" ? "Top" : "Newest"}
                </Link>
              ))}
            </div>
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
            <ul className="divide-y rounded-xl border bg-card">
              {posts.map((p) => (
                <li key={p.id} className="relative flex gap-4 px-5 py-4 hover:bg-muted/40">
                  <div className="flex w-10 shrink-0 flex-col items-center pt-0.5 text-center" aria-label={`${p.score} upvotes`}>
                    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={p.voted ? "text-primary" : "text-muted-foreground"}>
                      <path d="M6 2 11 8H1z" />
                    </svg>
                    <span className="text-sm font-semibold tabular-nums">{p.score}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium">
                      <Link href={`${here}/${p.id}`} className="after:absolute after:inset-0 hover:text-primary">
                        {p.title}
                      </Link>
                    </h2>
                    {p.excerpt ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                    ) : p.spoiler ? (
                      <p className="mt-1 text-sm italic text-muted-foreground">Contains a spoiler</p>
                    ) : null}
                    <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <AuthorLine author={p.author} at={p.created_at} edited={p.edited} profileBase={links.community("/u/")} />
                      {p.language && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{p.language === "python" ? "Python" : "JavaScript"}</span>}
                      <span className="text-xs text-muted-foreground">
                        {p.comments} comment{p.comments === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(page > 1 || more) && (
            <nav aria-label="Pages" className="flex justify-between text-sm">
              {page > 1 ? (
                <Link href={`${here}?${new URLSearchParams({ ...(sort === "new" ? { sort } : {}), page: String(page - 1) })}`} className="text-primary hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {more && (
                <Link href={`${here}?${new URLSearchParams({ ...(sort === "new" ? { sort } : {}), page: String(page + 1) })}`} className="text-primary hover:underline">
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  )
}
