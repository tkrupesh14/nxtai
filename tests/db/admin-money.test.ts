// Admin 6.4 (migration 038): money and AI in rupees — the usage log with learner and model, the dollar rate,
// admin_money, paged payments, one learner's AI cost, and the Overview in rupees.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const KEY = "test-server-key"
const log = (kind: string, tin: number, tout: number, model: string | null = null) =>
  t.query(`select public.app_log_ai_usage($1, $2, $3, $4, $5)`, [KEY, kind, tin, tout, model])

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B, "ravi@example.com")
})

describe("admin money", () => {
  it("is for admins only", async () => {
    await t.asUser(USER_A)
    for (const sql of [`public.admin_money(30)`, `public.admin_payment_list()`, `public.admin_user_ai('${USER_B}')`, `public.admin_set_usd_inr(90)`]) {
      expect(await errorOf(call(sql))).toMatch(/admin only/)
    }
    await t.asAnon()
    expect(await errorOf(call(`public.admin_money(30)`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select * from private.admin_settings`))).toMatch(/permission denied/)
  })

  it("logs who an AI call was for and the model, and still takes the old 4-argument call", async () => {
    expect(await errorOf(t.query(`select public.app_log_ai_usage('wrong', 'lesson', 1, 1)`))).toBeTruthy()
    await t.asUser(USER_A)
    await log("lesson", 1000, 2000, "openai/gpt-6-luna")
    await t.asAnon()
    await t.query(`select public.app_log_ai_usage($1, 'goal_check', 10, 20)`, [KEY])
    await t.asOwner()
    expect(await t.query(`select kind, user_id, model from public.ai_usage order by id`)).toEqual([
      { kind: "lesson", user_id: USER_A, model: "openai/gpt-6-luna" },
      { kind: "goal_check", user_id: null, model: null },
    ])
  })

  it("adds up revenue, AI cost by feature, model and learner, and credits, in rupees", async () => {
    await t.asUser(USER_A)
    await log("lesson", 1_000_000, 1_000_000, "global.openai.gpt-6-luna") // $0.60
    await log("course_plan", 1_000_000, 0, "some/new-model") // unpriced: as Luna, $0.10
    await t.asOwner()
    await t.query(
      `insert into public.payment_orders (user_id, razorpay_order_id, product, amount_paise, status, paid_at) values
         ($1, 'o1', 'c100', 4900, 'paid', now()), ($2, 'o2', 'pro30', 19900, 'paid', now() - interval '40 days'), ($2, 'o3', 'c100', 4900, 'created', null)`,
      [USER_A, USER_B],
    )
    await t.query(`insert into public.coding_coach_requests (user_id, problem, kind, fingerprint, status, tokens_in, tokens_out) select $1, slug, 'review', repeat('a', 64), 'answered', 20000, 0 from public.coding_problems limit 1`, [USER_B])
    await t.query(`insert into public.credit_ledger (user_id, delta, reason, note) values ($1, 50, 'grant', 'x'), ($1, -20, 'course', null)`, [USER_A])

    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_set_usd_inr(100)`)
    const m = await call(`public.admin_money(30)`)
    expect(m).toMatchObject({ days: 30, revenue_paise: 4900, paid_orders: 1, unpaid_orders: 1, ai_calls: 3, ai_unpriced: 1, rate: { usd_inr: 100, by: "admin@example.com" } })
    expect(Number(m.ai_inr)).toBeCloseTo(70.2) // $0.60 + $0.10 + $0.002 coach, at ₹100
    expect(m.daily).toHaveLength(30)
    expect(Number(m.daily[0].ai_inr)).toBeCloseTo(70.2)
    expect(m.daily[0]).toMatchObject({ revenue_paise: 4900, orders: 1 })
    expect(m.features.map((f: { feature: string; inr: string }) => [f.feature, Number(f.inr)])).toEqual([
      ["lesson", 60],
      ["course_plan", 10],
      ["coach_reply", 0.2],
    ])
    expect(m.models).toEqual(
      expect.arrayContaining([expect.objectContaining({ model: "gpt-6-luna", priced: true }), expect.objectContaining({ model: "new-model", priced: false })]),
    )
    expect(m.learners.map((l: { email: string; inr: string; paid_paise: number }) => [l.email, Number(l.inr), l.paid_paise])).toEqual([
      ["asha@example.com", 70, 4900],
      ["ravi@example.com", 0.2, 0],
    ])
    expect(m.credits).toEqual([
      { reason: "course", added: 0, used: 20, entries: 1 },
      { reason: "grant", added: 50, used: 0, entries: 1 },
    ])
    expect((await call(`public.admin_money(90)`)).revenue_paise).toBe(24800)
    expect((await call(`public.admin_money(5)`)).days).toBe(30)

    const ai = await call(`public.admin_user_ai($1)`, [USER_A])
    expect(Number(ai.inr)).toBeCloseTo(70)
    expect(ai.features.map((f: { feature: string }) => f.feature)).toEqual(["lesson", "course_plan"])

    const o = await call(`public.admin_overview()`)
    expect(Number(o.ai_inr_today)).toBeCloseTo(70.2)
    expect(o).not.toHaveProperty("ai_usd_today")
    const day = await t.one<{ ai_inr: string }>(`select ai_inr from public.admin_daily(7) limit 1`)
    expect(Number(day!.ai_inr)).toBeCloseTo(70.2)
  })

  it("pages payments by status", async () => {
    await t.query(
      `insert into public.payment_orders (user_id, razorpay_order_id, product, amount_paise, status, paid_at, created_at)
       select $1, 'o' || g, 'c100', 4900, case when g % 3 = 0 then 'failed' when g % 2 = 0 then 'paid' else 'created' end,
              case when g % 2 = 0 and g % 3 <> 0 then now() - make_interval(hours => g) end, now() - make_interval(hours => g)
         from generate_series(1, 12) g`,
      [USER_A],
    )
    await t.asUser(USER_ADMIN)
    const all = await call(`public.admin_payment_list('all', 5, 0)`)
    expect(all.total).toBe(12)
    expect(all.rows).toHaveLength(5)
    expect(all.rows[0]).toMatchObject({ email: "asha@example.com", razorpay_order_id: "o1" })
    expect((await call(`public.admin_payment_list('paid', 50, 0)`)).total).toBe(4)
    expect((await call(`public.admin_payment_list('failed', 50, 0)`)).total).toBe(4)
    expect((await call(`public.admin_payment_list('nonsense', 50, 10)`)).rows).toHaveLength(2)
  })

  it("keeps the dollar rate within sense and logs changes", async () => {
    await t.asUser(USER_ADMIN)
    expect(await errorOf(call(`public.admin_set_usd_inr(5)`))).toMatch(/bad_rate/)
    await t.query(`select public.admin_set_usd_inr(91.456)`)
    const a = (await call(`public.admin_audit()`))[0]
    expect(a).toMatchObject({ action: "usd_inr", admin: "admin@example.com" })
    expect(Number(a.detail.from)).toBe(88)
    expect(Number(a.detail.to)).toBe(91.46)
  })
})
