import type { ComponentType, SVGProps } from "react"

import { BookOpenIcon, BrainIcon, RocketIcon, ShieldCheckIcon, TrophyIcon, UsersIcon } from "@/components/site/icons"
import { Badge } from "@/components/site/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/site/ui/card"
import { Separator } from "@/components/site/ui/separator"

type Item = { title: string; description: string; icon: ComponentType<SVGProps<SVGSVGElement>>; wide?: boolean }

const items: Item[] = [
  {
    title: "Adaptive course builder",
    description:
      "Answer a few questions about your goals and background—Krpex designs the right learning path with milestones, resources, and checkpoints.",
    icon: BrainIcon,
  },
  {
    title: "AI-generated content & assessments",
    description:
      "Learn with clear, bite-sized explanations. Practice with auto-generated quizzes, projects, and feedback to master each topic faster.",
    icon: BookOpenIcon,
  },
  {
    title: "Proctored coding practice",
    description:
      "A focused coding environment with proctoring and AI evaluation to build confidence for interviews, hackathons, and real jobs.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Communities, events, hackathons",
    description:
      "Meet peers, host or join events, and participate in hackathons to learn by doing and expand your network.",
    icon: UsersIcon,
  },
  {
    title: "Mock interviews powered by AI",
    description:
      "Practice technical and behavioral interviews with instant feedback, suggested improvements, and progress tracking.",
    icon: RocketIcon,
    wide: true,
  },
  {
    title: "Rewards that motivate",
    description:
      "Earn points and badges by completing lessons, passing assessments, and contributing to the community. Climb the leaderboard as you learn.",
    icon: TrophyIcon,
    wide: true,
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="text-center space-y-4">
        <Badge variant="secondary" className="rounded-full">
          About Krpex
        </Badge>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
          One LMS for modern, AI-assisted learning
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
          Krpex builds a personalized course plan for you by asking a few quick questions. Learn smarter with
          AI-generated lessons, assessments, and a proctored coding space— plus communities, events, and mock interviews
          to practice for the real world.
        </p>
      </section>

      <Separator className="my-10" />

      <section className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title} className={item.wide ? "md:col-span-2" : undefined}>
            <CardHeader className="flex flex-row items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{item.description}</CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
