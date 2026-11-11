import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Workspace } from "@/components/code/workspace/workspace"
import { getPostList } from "@/lib/community/data"
import { problemSpace } from "@/lib/community/posts"
import type { CoachAllowance, CoachTurn } from "@/lib/code/coach"
import { getCoachAllowance, getCoachHistory, getDailyProblem, getMyProgress, getMySubmissions, getProblemStats, hasRevealed, type MySubmission } from "@/lib/code/data"
import { codeLinks } from "@/lib/code/host"
import { planBySlug, planProblems } from "@/lib/code/plans"
import { PROBLEM_SUMMARIES, problemBySlug, publicProblem } from "@/lib/code/problems"
import { displayNameFor, getSignedInUser, initialsFor } from "@/lib/supabase/profile"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = problemBySlug((await params).slug)
  if (!p) return {}
  return { title: p.title, description: `${p.title}: a ${p.difficulty} ${p.topic.toLowerCase()} problem to solve in Python or JavaScript, with tests that run in your browser.` }
}

export default async function ProblemPage({ params, searchParams }: Props) {
  const slug = (await params).slug
  const planParam = (await searchParams).plan
  const problem = problemBySlug(slug)
  if (!problem) notFound()
  const [user, links, daily, allStats, community] = await Promise.all([
    getSignedInUser(),
    codeLinks(),
    getDailyProblem(),
    getProblemStats(),
    getPostList(problemSpace(slug), "solution", "top", 3),
  ])
  const cbase = links.community(`/p/${slug}`)
  let submissions: MySubmission[] = []
  let solvedList: string[] = []
  let triedList: string[] = []
  let revealed = false
  let coach: CoachTurn[] = []
  let allowance: CoachAllowance | null = null
  if (user) {
    const [subs, progress, rev, history, quota] = await Promise.all([getMySubmissions(slug), getMyProgress(), hasRevealed(slug), getCoachHistory(slug), getCoachAllowance()])
    coach = history
    allowance = quota
    submissions = subs
    solvedList = progress.solved
    triedList = progress.tried
    revealed = rev
  }
  const solved = new Set(solvedList)
  const tried = new Set(triedList)
  // Opened from a study plan (?plan=…): the arrows and the problem list follow the plan's order.
  const plan = typeof planParam === "string" ? planBySlug(planParam) : null
  const inPlan = plan && planProblems(plan).includes(slug) ? plan : null
  const bySlug = new Map(PROBLEM_SUMMARIES.map((p) => [p.slug, p]))
  const order = inPlan ? planProblems(inPlan).map((s) => bySlug.get(s)!) : PROBLEM_SUMMARIES
  const list = order.map((p) => ({ ...p, state: solved.has(p.slug) ? ("solved" as const) : tried.has(p.slug) ? ("tried" as const) : ("todo" as const) }))
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
      initialCoach={coach}
      coachAllowance={allowance}
      plan={inPlan ? { slug: inPlan.slug, title: inPlan.title, href: links.code(`/plans/${inPlan.slug}`) } : null}
      community={{
        solutions: community.counts.solution,
        discussions: community.counts.discussion,
        locked: community.locked,
        top: community.posts.map((p) => ({ title: p.title, score: p.score, href: `${cbase}/solutions/${p.id}` })),
        solutionsHref: `${cbase}/solutions`,
        discussHref: `${cbase}/discuss`,
        shareHref: `${cbase}/solutions/new`,
      }}
    />
  )
}
