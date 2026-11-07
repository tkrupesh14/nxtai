import Link from "next/link"
import type { ComponentType, ReactNode, SVGProps } from "react"

import { BackgroundEffects } from "@/components/site/background-effects"
import { AwardIcon, BookOpenIcon, BrainIcon, FileTextIcon, UsersIcon } from "@/components/site/icons"
import { Reveal } from "@/components/site/reveal"
import { SubjectGrid } from "@/components/site/subject-grid"
import { Button } from "@/components/site/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/site/ui/card"
import { CATEGORIES } from "@/lib/learning/catalog"
import { getSignedInUser } from "@/lib/supabase/profile"
import { PRICE_CARDS } from "@/lib/pricing"
import { cn } from "@/lib/utils"

type Feature = { title: string; description: string; icon: ComponentType<SVGProps<SVGSVGElement>>; points: string[] }

// Only what Krpex really does today (see docs/krpex-poster-design-language.md, "What Krpex does").
const features: Feature[] = [
  {
    title: "A course made for you",
    description: "Tell us your goal, your level and how much time you have. Your professor plans the modules and lessons around that.",
    icon: BookOpenIcon,
    points: ["Class-style lessons with worked examples", "Practice checkpoints and key takeaways"],
  },
  {
    title: "Ask your professor anything",
    description: "Stuck on a line? Ask about any section of your lesson and get an answer in seconds.",
    icon: BrainIcon,
    points: ["Quick buttons: Explain simpler, Give an example", "Hints during quizzes, never the answer"],
  },
  {
    title: "Learn from your own notes",
    description: "Upload your notes or a PDF and Krpex builds the course from them, so you learn what your class covers.",
    icon: FileTextIcon,
    points: ["PDF, Word or text files, or pasted notes", "Each lesson shows which pages it's taught from"],
  },
  {
    title: "In English or Hindi",
    description: "Choose the language for each course. Technical words stay clear: बल (force), ऊर्जा (energy).",
    icon: UsersIcon,
    points: ["Lessons, quizzes and answers in your language", "Switch any time for new courses"],
  },
]

const steps = [
  { title: "Answer a few questions", body: "What you want to learn, where you're starting from and how much time you have each week." },
  { title: "Learn lesson by lesson", body: "Read class-style lessons, try the checkpoints and ask your professor whenever something isn't clear." },
  { title: "Prove what you know", body: "Quizzes after lessons, a test after each module and a final exam. Pass it to get your certificate." },
]

const extras = ["Quiz after every lesson", "Module tests and a final exam", "Certificate", "Daily streaks", "Study reminders", "Works on your phone"]

function Eyebrow({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-primary">
      {n} — {children}
    </p>
  )
}

/** A still picture of a lesson, drawn with the app's own styles (not a screenshot). */
function LessonPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:mb-32 lg:max-w-none" aria-hidden>
      <div className="rounded-2xl border bg-card shadow-xl shadow-primary/5">
        <div className="flex items-center gap-1.5 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="ml-3 truncate rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">krpex.in/learn</span>
        </div>
        <div className="p-5 md:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary">Module 1 · Lesson 3</p>
          <p className="mt-1 text-lg font-semibold tracking-tight">Newton&apos;s first law</p>
          <div className="mt-4 rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Worked example</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A puck slides across ice at 5 m/s. Friction is tiny, so almost no force acts on it. What happens to its speed?
            </p>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium">Checkpoint</p>
            <div className="mt-2 grid gap-2 text-sm">
              <span className="rounded-lg border px-3 py-2 text-muted-foreground">It slows down and stops</span>
              <span className="rounded-lg border border-primary bg-primary/10 px-3 py-2 font-medium text-foreground">It keeps moving at 5 m/s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-32 -left-6 hidden w-64 rounded-xl border bg-card p-3 shadow-lg sm:block lg:-left-10">
        <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
          Why doesn&apos;t the puck stop?
        </p>
        <p className="mt-2 max-w-[90%] rounded-xl rounded-bl-sm border px-3 py-2 text-xs text-muted-foreground">
          Nothing is pushing against it. Without a force, motion doesn&apos;t change. That&apos;s inertia.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dr. Meera Nair (AI)</p>
      </div>

      <div className="absolute -right-4 -top-5 hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-md sm:flex">
        <span className="size-2 rounded-full bg-primary" /> Quiz · 4 of 5 right
      </div>
      <div className="absolute -bottom-4 right-6 hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-md sm:flex">
        <AwardIcon className="size-3.5 text-primary" /> Certificate on completion
      </div>
    </div>
  )
}

export default async function HomePage() {
  const signedIn = Boolean(await getSignedInUser())
  const start = signedIn ? { href: "/onboarding", label: "Start a new course" } : { href: "/create-account", label: "Start learning free" }
  const subjects = CATEGORIES.map(({ id, name, icon, group, subcategories }) => ({ id, name, icon, group, subcategories }))
  const subjectCount = CATEGORIES.reduce((n, c) => n + c.subcategories.length, 0)

  return (
    <main>
      <BackgroundEffects />

      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="mx-auto h-full max-w-6xl bg-[radial-gradient(ellipse_at_top,theme(colors.primary/12),transparent_60%)]" />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> AI professor · English और हिन्दी
            </p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Your <span className="text-primary">personal course</span>, built from a few questions
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-muted-foreground md:text-lg lg:mx-0">
              Tell Krpex what you want to learn. Your AI professor plans the course and teaches it in class-style lessons,
              with quizzes and answers to your questions whenever you&apos;re stuck.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button asChild size="lg">
                <Link href={start.href}>{start.label} →</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <dl className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-4 border-t pt-6 text-left lg:mx-0">
              <div>
                <dt className="text-xs text-muted-foreground">Subjects</dt>
                <dd className="font-mono text-xl font-semibold tabular-nums">{subjectCount}+</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Languages</dt>
                <dd className="font-mono text-xl font-semibold">EN · हि</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">To start</dt>
                <dd className="font-mono text-xl font-semibold">Free</dd>
              </div>
            </dl>
          </div>
          <Reveal>
            <LessonPreview />
          </Reveal>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <Eyebrow n="01">How it works</Eyebrow>
            <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">From a goal to a certificate</h2>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <li className="h-full rounded-xl border bg-card p-6">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section id="platform" className="py-16 md:py-24">
        <div id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4">
          <div className="max-w-2xl">
            <Eyebrow n="02">What you get</Eyebrow>
            <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">A professor who teaches at your pace</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <Card className="relative h-full overflow-hidden border-border/60">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0"
                  />
                  <CardHeader className="flex flex-row items-center gap-3">
                    <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </span>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{f.description}</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {f.points.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <span aria-hidden className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {extras.map((e) => (
              <li key={e} className="rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
                {e}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="subjects" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow n="03">Subjects</Eyebrow>
            <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">Learn almost anything</h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Start from a ready-made course or describe your own goal. Each subject area has its own AI professor.
            </p>
          </div>
          <div className="mt-8">
            <SubjectGrid categories={subjects} />
          </div>
        </div>
      </section>

      <section id="professors" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <Eyebrow n="04">For professors</Eyebrow>
            <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">Teach many more learners, your way</h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              Professors can teach through Krpex by invitation. Your AI version teaches from your own material and in your
              style, and learners can send an answer to you when they want a real teacher to check it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/contact">Write to us</Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-3">
            {[
              ["Your material, your style", "Upload notes, lectures and model lessons. Your AI version teaches from them."],
              ["You check what matters", "Learners send you questions to check; you reply or confirm from your inbox."],
              ["Always labelled as AI", "Learners always see it's an AI version, for example “Dr. Asha Rao (AI)”."],
            ].map(([title, body]) => (
              <li key={title} className="rounded-xl border bg-card p-5">
                <p className="font-semibold tracking-tight">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="pricing" className="py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">
            Simple pricing for learners
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Start free. Go Pro for more questions and courses, or top up with credits when you need them.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 px-4 md:grid-cols-3">
          {PRICE_CARDS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 90}>
              <Card
                className={cn(
                  "h-full transition-transform duration-300 hover:-translate-y-1",
                  plan.highlighted && "border-primary ring-1 ring-primary/20"
                )}
              >
                <CardHeader>
                  <div className="flex items-baseline justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.badge && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{plan.badge}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-3xl font-semibold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" asChild>
                    <Link href={(signedIn && plan.signedInCta ? plan.signedInCta : plan.cta).href}>
                  {(signedIn && plan.signedInCta ? plan.signedInCta : plan.cta).label}
                </Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="get-started" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center md:px-12 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_65%)]"
            />
            <h2 className="relative text-balance text-3xl font-semibold tracking-tight md:text-4xl">Start your first lesson today</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
              Answer a few questions and your professor gets to work. Free to start, no card needed.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href={start.href}>{start.label} →</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/courses">Browse courses</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
