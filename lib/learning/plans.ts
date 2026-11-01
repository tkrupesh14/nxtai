// Plans and credits shown in the UI. Enforcement lives in Postgres (migration 007); keep the numbers in sync.

export type PlanId = "free" | "pro"

export const PLANS: Record<PlanId, { name: string; askDay: number; askLesson: number; quickDay: number; coursesMonth: number }> = {
  free: { name: "Free", askDay: 5, askLesson: 3, quickDay: 15, coursesMonth: 2 },
  pro: { name: "Pro", askDay: 40, askLesson: 10, quickDay: 100, coursesMonth: 10 },
}

export const CREDIT_COST = { question: 1, course: 20 } as const

/** Planned packs and price (payments are not live yet). */
export const CREDIT_PACKS = [
  { id: "c100", credits: 100, priceInr: 49 },
  { id: "c250", credits: 250, priceInr: 99 },
] as const
export const PRO_PRICE_INR = 499

export type AccountSummary = {
  plan: PlanId
  askDay: number
  askLesson: number
  quickDay: number
  coursesMonth: number
  credits: number
  coursesUsed: number
  periodEnd: string | null
}

export const FREE_SUMMARY: AccountSummary = {
  plan: "free",
  askDay: PLANS.free.askDay,
  askLesson: PLANS.free.askLesson,
  quickDay: PLANS.free.quickDay,
  coursesMonth: PLANS.free.coursesMonth,
  credits: 0,
  coursesUsed: 0,
  periodEnd: null,
}
