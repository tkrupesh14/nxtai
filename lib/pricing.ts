// One price list for the home page and /pricing, built from the real plan limits (lib/learning/plans.ts).
import { CREDIT_COST, CREDIT_PACKS, PLANS, PRO_DAYS, PRO_PRICE_INR } from "@/lib/learning/plans"

export type PriceCard = {
  id: "free" | "pro" | "credits"
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: { label: string; href: string }
  badge?: string
  highlighted?: boolean
}

const packs = CREDIT_PACKS.map((p) => `${p.credits} credits for ₹${p.priceInr}`).join(" · ")

export const PRICE_CARDS: PriceCard[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "Everything you need to start learning with your AI professor.",
    features: [
      "Personal AI courses in 9 subjects",
      "An AI professor for every course",
      "Class-style lessons, checkpoints and quizzes",
      `${PLANS.free.askDay} questions to your professor a day`,
      `${PLANS.free.quickDay} quick answers a day`,
      `${PLANS.free.coursesMonth} new courses a month`,
    ],
    cta: { label: "Get started free", href: "/create-account" },
  },
  {
    id: "pro",
    name: "Pro",
    price: `₹${PRO_PRICE_INR}`,
    period: ` / ${PRO_DAYS} days`,
    description: "For serious learners who ask a lot of questions.",
    features: [
      "Everything in Free",
      `${PLANS.pro.askDay} questions to your professor a day`,
      `${PLANS.pro.quickDay} quick answers a day`,
      `${PLANS.pro.coursesMonth} new courses a month`,
      "Priority email support",
      "No auto-renewal: buy again when you need it",
    ],
    cta: { label: "Get Pro", href: "/account#credits" },
    badge: "Best value",
    highlighted: true,
  },
  {
    id: "credits",
    name: "Credits",
    price: `₹${CREDIT_PACKS[0].priceInr}`,
    period: " onwards",
    description: "Top up when you need more, on any plan. No subscription.",
    features: [
      packs,
      `${CREDIT_COST.question} credit = 1 extra question`,
      `${CREDIT_COST.course} credits = 1 extra course`,
      "Credits never expire",
      "Unused packs refundable within 7 days",
    ],
    cta: { label: "Buy credits", href: "/account#credits" },
  },
]

/** Plan comparison for /pricing. */
export const PRICE_COMPARISON: { feature: string; free: string | boolean; pro: string | boolean }[] = [
  { feature: "Personal AI courses (9 subjects)", free: true, pro: true },
  { feature: "AI professor lessons, checkpoints and quizzes", free: true, pro: true },
  { feature: "Questions to your professor", free: `${PLANS.free.askDay} a day`, pro: `${PLANS.pro.askDay} a day` },
  { feature: "Quick answers", free: `${PLANS.free.quickDay} a day`, pro: `${PLANS.pro.quickDay} a day` },
  { feature: "New courses", free: `${PLANS.free.coursesMonth} a month`, pro: `${PLANS.pro.coursesMonth} a month` },
  { feature: "Top up with credits", free: true, pro: true },
  { feature: "Priority email support", free: false, pro: true },
]
