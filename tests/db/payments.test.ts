// Razorpay orders and payments: only our server creates orders, and a payment is applied once, for the right amount.
import { beforeEach, describe, expect, it } from "vitest"

import { PRODUCTS } from "@/lib/learning/plans"

import { createTestDb, errorOf, SERVER_KEY, USER_A, type TestDb } from "../support/db"

let t: TestDb

const order = async (orderId: string, product: keyof typeof PRODUCTS) => {
  const p = PRODUCTS[product]
  await t.asUser(USER_A)
  await t.query(`select public.app_create_order($1, $2, $3, $4, $5, $6)`, [SERVER_KEY, orderId, product, p.priceInr * 100, p.credits, p.proDays])
}
// The webhook calls in with the anon key.
const apply = async (orderId: string, paymentId: string, amountPaise: number, key = SERVER_KEY) => {
  await t.asAnon()
  return (await t.one<{ r: string }>(`select public.app_apply_payment($1, $2, $3, $4) as r`, [key, orderId, paymentId, amountPaise]))?.r
}
const summary = async () => {
  await t.asUser(USER_A)
  return t.one<{ plan: string; credits: number; period_end: string | null }>(`select plan, credits, period_end from public.my_account_summary()`)
}

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
})

describe("payments", () => {
  it("adds credits exactly once", async () => {
    await order("order_1", "c100")
    expect(await apply("order_1", "pay_1", 4900)).toBe("applied")
    expect(await apply("order_1", "pay_1", 4900)).toBe("already") // webhook + checkout callback both arrive
    expect((await summary())?.credits).toBe(100)
  })

  it("refuses a wrong amount, a wrong key and unknown orders", async () => {
    await order("order_1", "c250")
    expect(await apply("order_1", "pay_1", 100)).toBe("amount_mismatch")
    expect(await errorOf(apply("order_1", "pay_1", 9900, "wrong"))).toMatch(/server key|permission/i)
    expect(await apply("order_x", "pay_2", 9900)).toBe("not_found")
    expect((await summary())?.credits).toBe(0)
  })

  it("Pro passes stack: two passes give about 60 days", async () => {
    await order("order_1", "pro30")
    await order("order_2", "pro30")
    expect(await apply("order_1", "pay_1", 49900)).toBe("applied")
    expect(await apply("order_2", "pay_2", 49900)).toBe("applied")
    const s = await summary()
    expect(s?.plan).toBe("pro")
    const days = (new Date(s!.period_end!).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(59)
    expect(days).toBeLessThan(61)
  })

  it("orders can't be created without the server key", async () => {
    await t.asUser(USER_A)
    expect(await errorOf(t.query(`select public.app_create_order('wrong', 'o', 'c100', 1, 1000, 0)`))).toMatch(/server key|permission/i)
  })
})
