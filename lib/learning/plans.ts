// Plans and credits shown in the UI. Enforcement lives in Postgres (migration 007); keep the numbers in sync.

export type PlanId = "free" | "pro"

export const PLANS: Record<PlanId, { name: string; askDay: number; askLesson: number; quickDay: number; coursesMonth: number }> = {
  free: { name: "Free", askDay: 5, askLesson: 3, quickDay: 15, coursesMonth: 2 },
  pro: { name: "Pro", askDay: 40, askLesson: 10, quickDay: 100, coursesMonth: 10 },
}

export const CREDIT_COST = { question: 1, course: 20 } as const

/** Why a new course can't be created right now (reasons from course_allowance / the courses trigger). */
export const COURSE_LIMIT_MESSAGES: Record<string, string> = {
  daily_limit: "You can create up to 3 courses a day. Please come back tomorrow.",
  monthly_limit:
    "You've used this month's free courses. Each extra course uses 20 credits. Recharge from your account page, or finish your current courses first.",
}

/** What can be bought. Prices are set here only (never from the browser). */
export const CREDIT_PACKS = [
  { id: "c100", credits: 100, priceInr: 49 },
  { id: "c250", credits: 250, priceInr: 99 },
] as const
export const PRO_PRICE_INR = 499
export const PRO_DAYS = 30

export type ProductId = "c100" | "c250" | "pro30"
export const PRODUCTS: Record<ProductId, { label: string; priceInr: number; credits: number; proDays: number }> = {
  c100: { label: "100 credits", priceInr: 49, credits: 100, proDays: 0 },
  c250: { label: "250 credits", priceInr: 99, credits: 250, proDays: 0 },
  pro30: { label: `Pro for ${PRO_DAYS} days`, priceInr: PRO_PRICE_INR, credits: 0, proDays: PRO_DAYS },
}
export const isProductId = (v: string): v is ProductId => v in PRODUCTS

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
