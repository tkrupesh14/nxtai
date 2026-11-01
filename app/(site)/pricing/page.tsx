import Link from "next/link"

import { CheckIcon, MinusIcon } from "@/components/site/icons"
import { Badge } from "@/components/site/ui/badge"
import { Button } from "@/components/site/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/site/ui/card"
import { Separator } from "@/components/site/ui/separator"
import { PRICE_CARDS, PRICE_COMPARISON } from "@/lib/pricing"

export const metadata = { title: "Pricing — NxtAI" }

function CompareCell({ value }: { value: string | boolean }) {
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
  return <span>{value}</span>
}

const FAQ = [
  {
    q: "What are credits?",
    a: "Credits let you keep going after your daily or monthly allowance runs out: 1 credit for an extra question to your professor, 20 credits for an extra course. They never expire.",
  },
  {
    q: "When can I buy Pro or credits?",
    a: "Payments are being set up now. Everyone can use the Free plan today, and you'll be able to upgrade from your account page as soon as payments go live.",
  },
  {
    q: "Can I cancel or get a refund?",
    a: "Cancel Pro anytime and keep it until the end of the period you paid for. Unused credit packs can be refunded within 7 days.",
  },
  {
    q: "Are the professors real people?",
    a: "No. Each subject has an AI professor persona that teaches in a consistent style. AI can make mistakes, so double-check anything important.",
  },
]

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <section className="space-y-4 text-center">
        <Badge variant="secondary" className="rounded-full">
          Pricing
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">Simple pricing for focused learning</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground text-pretty">
          Start free. Go Pro for more questions and courses, or top up with credits when you need them. Prices in INR,
          including taxes.
        </p>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PRICE_CARDS.map((plan) => (
          <Card key={plan.id} className={plan.highlighted ? "border-primary" : undefined}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.badge && (
                  <Badge variant={plan.highlighted ? "default" : "secondary"} className="rounded-full">
                    {plan.badge}
                  </Badge>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-3xl font-semibold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="grid gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={plan.highlighted || plan.id === "free" ? "default" : "outline"} asChild>
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-12" />

      <section aria-labelledby="compare-heading" className="space-y-6">
        <h2 id="compare-heading" className="text-xl font-semibold md:text-2xl">
          Compare plans
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">Feature</th>
                <th className="p-3 text-left font-medium">Free</th>
                <th className="p-3 text-left font-medium">Pro</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_COMPARISON.map((row) => (
                <tr key={row.feature} className="border-t">
                  <td className="p-3">{row.feature}</td>
                  <td className="p-3">
                    <CompareCell value={row.free} />
                  </td>
                  <td className="p-3">
                    <CompareCell value={row.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mt-12 space-y-6">
        <h2 id="faq-heading" className="text-xl font-semibold md:text-2xl">
          Questions
        </h2>
        <dl className="grid gap-6 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground text-pretty">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          Details in our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/refund-policy" className="underline hover:text-foreground">
            Refund & Cancellation Policy
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
