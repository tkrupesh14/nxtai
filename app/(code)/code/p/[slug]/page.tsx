import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Workspace } from "@/components/code/workspace/workspace"
import { getDailyProblem, getMyProgress, getMySubmissions, getProblemStats, hasRevealed, type MySubmission } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { PROBLEM_SUMMARIES, problemBySlug, publicProblem } from "@/lib/code/problems"
import { displayNameFor, getSignedInUser, initialsFor } from "@/lib/supabase/profile"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = problemBySlug((await params).slug)
  if (!p) return {}
  return { title: p.title, description: `${p.title}: a ${p.difficulty} ${p.topic.toLowerCase()} problem to solve in Python or JavaScript, with tests that run in your browser.` }
}

export default async function ProblemPage({ params }: Props) {
  const slug = (await params).slug
  const problem = problemBySlug(slug)
  if (!problem) notFound()
  const [user, links, daily, allStats] = await Promise.all([getSignedInUser(), codeLinks(), getDailyProblem(), getProblemStats()])
  let submissions: MySubmission[] = []
  let solvedList: string[] = []
  let triedList: string[] = []
  let revealed = false
  if (user) {
    const [subs, progress, rev] = await Promise.all([getMySubmissions(slug), getMyProgress(), hasRevealed(slug)])
    submissions = subs
    solvedList = progress.solved
    triedList = progress.tried
    revealed = rev
  }
  const solved = new Set(solvedList)
  const tried = new Set(triedList)
  const list = PROBLEM_SUMMARIES.map((p) => ({ ...p, state: solved.has(p.slug) ? ("solved" as const) : tried.has(p.slug) ? ("tried" as const) : ("todo" as const) }))
  const name = user ? displayNameFor(user) : ""

  return (
    <Workspace
      key={slug}
      problem={publicProblem(problem)}
      statement={<ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statement}</ReactMarkdown>}
      list={list}
      hrefPrefix={links.code("/p/")}
      problemsHref={links.code("/problems")}
      loginHref={links.main(`/login?next=${encodeURIComponent(`/code/p/${slug}`)}`)}
      accountHref={links.main("/account")}
      user={user ? { name, initials: initialsFor(name) } : null}
      initialSubmissions={submissions}
      initialSolved={solved.has(slug)}
      initialRevealed={revealed}
      daily={daily === slug}
      stats={allStats[slug] ?? null}
    />
  )
}
