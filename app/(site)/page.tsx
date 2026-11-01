import Link from "next/link"
import type { ComponentType, SVGProps } from "react"

import { BackgroundEffects } from "@/components/site/background-effects"
import {
  AwardIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  MicIcon,
  SquareTerminalIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/site/icons"
import { Reveal } from "@/components/site/reveal"
import { Button } from "@/components/site/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/site/ui/card"
import { PRICE_CARDS } from "@/lib/pricing"
import { cn } from "@/lib/utils"

type Feature = { title: string; description: string; icon: ComponentType<SVGProps<SVGSVGElement>> }

const features: Feature[] = [
  {
    title: "Adaptive course builder",
    description: "Answer a few questions—NxtAI builds your personal learning path and adapts as you learn.",
    icon: ClipboardCheckIcon,
  },
  {
    title: "Smart notes & summaries",
    description: "Turn lectures or chapters into bite-sized notes and study guides that fit your style.",
    icon: FileTextIcon,
  },
  {
    title: "Bring your own docs",
    description: "Upload PDFs and materials—AI teaches you using your own context.",
    icon: UploadIcon,
  },
  {
    title: "Auto assessments & practice",
    description: "Generate practice quizzes and assignments in one click, with instant feedback.",
    icon: ClipboardCheckIcon,
  },
  {
    title: "Proctored coding",
    description: "Practice in a secure environment. Run tests and get AI code reviews.",
    icon: SquareTerminalIcon,
  },
  {
    title: "Communities & events",
    description: "Find peers nearby, host meetups, and organize hackathons with signups.",
    icon: UsersIcon,
  },
  {
    title: "Mock interviews",
    description: "Simulate real interviews. Get scores, tips, and targeted prep to level up.",
    icon: MicIcon,
  },
  {
    title: "Rewards & streaks",
    description: "Stay motivated with badges, XP, and weekly streaks for consistent progress.",
    icon: AwardIcon,
  },
]

export default function HomePage() {
  return (
    <main>
      <BackgroundEffects />

      <section className="relative isolate overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 md:pt-20 md:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Your personal course—built from a few questions
            </h1>
            <p className="mt-4 text-pretty text-muted-foreground md:text-lg">
              NxtAI asks you a few quick questions and builds your personal learning path—then generates content,
              assessments, proctored coding, communities, mock interviews, and rewards in one place.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <a href="#get-started">Start learning</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#features">See features</a>
              </Button>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="mx-auto h-full max-w-6xl bg-[radial-gradient(ellipse_at_top,theme(colors.primary/10),transparent_60%)]" />
          </div>
        </div>
      </section>

      <section id="platform" className="py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">Platform Overview</p>
          <h2 className="text-pretty text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need to learn with AI
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            NxtAI brings together content, practice, coding, interviews, and community—so you can learn faster and
            stay motivated.
          </p>
        </div>
        <div
          id="features"
          className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 px-4 md:mt-12 md:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 60}>
              <Card className="relative h-full border-border/60 transition-transform duration-300 hover:-translate-y-1 hover:shadow-sm">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0"
                />
                <CardHeader className="flex flex-row items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary"
                  >
                    <f.icon className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
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
                    <Link href={plan.cta.href}>{plan.cta.label}</Link>
                  </Button>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="get-started" className="border-y py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center">
          <h3 className="text-pretty text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to build the future of learning with AI?
          </h3>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Spin up your workspace in minutes. Add modules as you go—content, assessments, coding, communities,
            interviews, and rewards.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/create-account">Create your account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#features">Explore features</a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
