import { describe, expect, it } from "vitest"

import { CREDIT_PACKS, PLANS, PRO_DAYS, PRO_PRICE_INR, PRODUCTS } from "@/lib/learning/plans"
import { PRICE_CARDS } from "@/lib/pricing"

describe("price list", () => {
  it("sells the same packs it advertises", () => {
    for (const p of CREDIT_PACKS) {
      expect(PRODUCTS[p.id]).toMatchObject({ priceInr: p.priceInr, credits: p.credits, proDays: 0 })
    }
    expect(PRODUCTS.pro30).toMatchObject({ priceInr: PRO_PRICE_INR, credits: 0, proDays: PRO_DAYS })
  })

  it("shows the real plan limits on the pricing cards", () => {
    const text = (id: string) => JSON.stringify(PRICE_CARDS.find((c) => c.id === id))
    expect(text("free")).toContain(`${PLANS.free.askDay} questions`)
    expect(text("free")).toContain(`${PLANS.free.coursesMonth} new courses`)
    expect(text("pro")).toContain(`₹${PRO_PRICE_INR}`)
    expect(text("pro")).toContain(String(PLANS.pro.askDay))
  })
})
