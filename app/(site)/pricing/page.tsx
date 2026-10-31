import Link from "next/link"

import { CheckIcon, MinusIcon } from "@/components/site/icons"
import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/site/ui/card"
import { Separator } from "@/components/site/ui/separator"

type Plan = {
  name: string
  description: string
  price: string
  features: string[]
  cta: string
  badge?: string
}

const plans: Plan[] = [
  {
    name: "Student Free",
    description: "Start learning with AI guidance and community.",
    price: "₹0",
    features: [
      "Adaptive course builder (basic)",
      "AI-generated lessons & quizzes",
      "Proctored coding (limited)",
      "Community access",
      "Weekly mock interview (1/mo)",
    ],
    cta: "Get started",
  },
  {
    name: "Student Pro",
    description: "Serious learning with full AI tools and practice.",
    price: "₹499",
    features: [
      "Adaptive course builder (advanced)",
      "Unlimited AI lessons & assessments",
      "Proctored coding with AI feedback",
      "Mock interviews (unlimited practice)",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    badge: "Best for most",
  },
  {
    name: "Community Host",
    description: "Run events, hackathons, and manage student cohorts.",
    price: "₹1,999",
    features: [
      "All Pro features",
      "Create & host events/hackathons",
      "Cohort & leaderboard tools",
      "Team analytics & reports",
      "Custom branding",
    ],
    cta: "Start hosting",
  },
]

// true = included, false = not included, string = shown as-is
type Cell = boolean | string

const comparison: { feature: string; values: [Cell, Cell, Cell] }[] = [
  { feature: "Adaptive course builder", values: [true, true, true] },
  { feature: "AI-generated lessons", values: [true, true, true] },
  { feature: "AI assessments & feedback", values: [true, true, true] },
  { feature: "Proctored coding", values: ["Limited", true, true] },
  { feature: "Mock interviews", values: ["1/mo", "Unlimited", "Unlimited"] },
  { feature: "Community access", values: [true, true, true] },
  { feature: "Host events & hackathons", values: [false, false, true] },
  { feature: "Priority support", values: [false, true, true] },
  { feature: "Team analytics", values: [false, false, true] },
  { feature: "Custom branding", values: [false, false, true] },
]

function CompareCell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
        Included
      </span>
    )
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <MinusIcon className="h-4 w-4" aria-hidden="true" />
        Not included
      </span>
    )
  }
  return <span className="text-muted-foreground">{value}</span>
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="text-center space-y-4">
        <Badge variant="secondary" className="rounded-full">
          Pricing
        </Badge>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-balance">
          Simple plans for focused learning
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-pretty">
          Choose the plan that fits your goals. Upgrade anytime as you grow. Prices shown in INR.
        </p>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.badge ? "border-primary" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.badge && <Badge className="rounded-full">{plan.badge}</Badge>}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-semibold">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" asChild>
                <Link href="/create-account">{plan.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-12" />

      <section aria-labelledby="compare-heading" className="space-y-6">
        <h2 id="compare-heading" className="text-xl md:text-2xl font-semibold">
          Compare plans
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.name} className="text-left p-3 font-medium">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className="border-t">
                  <td className="p-3">{row.feature}</td>
                  {row.values.map((value, i) => (
                    <td key={i} className="p-3">
                      <CompareCell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
