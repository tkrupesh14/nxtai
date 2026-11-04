import Link from "next/link"

import { ProfessorAvatar } from "@/components/learn/professor"
import { Button } from "@/components/site/ui/button"
import { languageName, subjectName } from "@/lib/teach/subjects"
import { teacherPersona, type PublicProfessor } from "@/lib/teach/teaching"

/** A live professor's public page (also previewed by the professor in /teach). Always says it's an AI version. */
export function PublicProfile({ professor, preview = false }: { professor: PublicProfessor; preview?: boolean }) {
  const persona = teacherPersona(professor)
  const subject = subjectName(professor.subject)
  return (
    <article className="grid gap-6">
      <header className="flex items-start gap-4">
        <ProfessorAvatar professor={persona} size="lg" />
        <div className="min-w-0">
          <h1 className={preview ? "text-xl font-semibold" : "text-3xl font-semibold tracking-tight text-balance"}>{professor.display_name}</h1>
          {(professor.title || professor.institution) && (
            <p className="mt-1 text-muted-foreground">{[professor.title, professor.institution].filter(Boolean).join(", ")}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {subject} · teaches in {professor.languages.map(languageName).join(" and ")}
          </p>
        </div>
      </header>
      {professor.bio && <p className="text-pretty whitespace-pre-line">{professor.bio}</p>}
      <section className="rounded-xl border bg-card p-5 text-sm" aria-labelledby="ai-version">
        <h2 id="ai-version" className="font-semibold">
          Learn with {persona.name}
        </h2>
        <p className="mt-2 text-muted-foreground text-pretty">
          {persona.name} is an AI tutor, not {professor.display_name}. It writes your lessons, tests and answers from{" "}
          {professor.display_name}&apos;s own lecture notes, recordings and model lessons
          {professor.materials + professor.lessons > 0
            ? ` (${professor.materials} published item${professor.materials === 1 ? "" : "s"} of material, ${professor.lessons} model lesson${professor.lessons === 1 ? "" : "s"})`
            : ""}
          , and follows how they teach. {professor.display_name} doesn&apos;t check each lesson, so the AI can make mistakes.
        </p>
        {!preview && (
          <Button asChild className="mt-4">
            <Link href={`/onboarding?teacher=${professor.id}`}>Start a {subject} course with {persona.name}</Link>
          </Button>
        )}
      </section>
    </article>
  )
}
