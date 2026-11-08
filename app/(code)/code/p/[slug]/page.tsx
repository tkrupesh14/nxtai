import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ProblemWorkspace } from "@/components/code/problem-workspace"
import { DifficultyBadge } from "@/components/code/difficulty-badge"
import { getDailyProblem, getMySubmissions } from "@/lib/code/data"
import type { CodeLanguage } from "@/lib/code/harness"
import { codeLinks } from "@/lib/code/host"
import { XP_FOR, problemBySlug, publicProblem } from "@/lib/code/problems"
import { getSignedInUser } from "@/lib/supabase/profile"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = problemBySlug((await params).slug)
  if (!p) return {}
  return { title: p.title, description: `${p.title}: a ${p.difficulty} ${p.topic.toLowerCase()} problem to solve in Python or JavaScript.` }
}

const json = (v: unknown) => JSON.stringify(v).replace(/,(?=\S)/g, ", ").replace(/:(?=\S)/g, ": ")

export default async function ProblemPage({ params }: Props) {
  const slug = (await params).slug
  const problem = problemBySlug(slug)
  if (!problem) notFound()
  const [user, links, daily] = await Promise.all([getSignedInUser(), codeLinks(), getDailyProblem()])
  const submissions = user ? await getMySubmissions(slug) : []
  const saved: Partial<Record<CodeLanguage, string>> = {}
  for (const s of [...submissions].reverse()) saved[s.language] = s.code
  const solved = submissions.some((s) => s.solved)
  const isDaily = daily === slug
  const xp = XP_FOR[problem.difficulty] * (isDaily ? 2 : 1)

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:h-[calc(100dvh-4.25rem)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:py-5">
      <article className="min-h-0 overflow-auto rounded-xl border bg-card p-5">
        <Link href={links.code("/problems")} className="text-sm text-muted-foreground hover:text-foreground">
          ← All problems
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{problem.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <DifficultyBadge difficulty={problem.difficulty} />
          <span>{problem.topic}</span>
          <span aria-hidden>·</span>
          <span>{solved ? "Solved ✓" : `${xp} XP${isDaily ? " (problem of the day)" : ""}`}</span>
        </div>

        <div className="lesson-prose mt-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{problem.statement}</ReactMarkdown>
        </div>

        <h2 className="mt-6 text-sm font-semibold">Examples</h2>
        <ul className="mt-2 space-y-2">
          {problem.tests.slice(0, problem.samples).map((t, i) => (
            <li key={i} className="rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
              <div>
                <span className="text-muted-foreground">Input: </span>
                {problem.params.map((name, j) => `${name} = ${json(t.args[j])}`).join(", ")}
              </div>
              <div>
                <span className="text-muted-foreground">Output: </span>
                {json(t.expected)}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Examples use JSON: <code>true</code>/<code>false</code>/<code>null</code> are <code>True</code>/<code>False</code>/<code>None</code> in Python.
          {problem.unordered && " Any order of the answer's items is accepted."}
        </p>

        {submissions.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-semibold">Your submissions</h2>
            <ul className="mt-2 divide-y text-sm">
              {submissions.slice(0, 5).map((s) => (
                <li key={s.id} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {s.solved ? "✓" : "✗"} {s.passed}/{s.total} tests · {s.language === "python" ? "Python" : "JavaScript"}
                    {s.xp > 0 && <span className="text-primary"> · +{s.xp} XP</span>}
                  </span>
                  <time dateTime={s.created_at} className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                  </time>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>

      <ProblemWorkspace
        problem={publicProblem(problem)}
        saved={saved}
        signedIn={Boolean(user)}
        loginHref={links.main(`/login?next=${encodeURIComponent(`/code/p/${slug}`)}`)}
      />
    </main>
  )
}
