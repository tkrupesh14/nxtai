// Krpex Code v2 Phase 3 (migration 031): the AI coach's limits, credits, refunds and the shared spend cap.
import { beforeEach, describe, expect, it } from "vitest"

import { COACH_DAILY } from "@/lib/code/coach"
import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb
const FP = "a".repeat(64)
const slug = PROBLEMS[0].slug

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

type Take = { request_id: string | null; reason: string | null; used_today: number; daily: number; paid: boolean; credits_left: number }
/** Ask for a coach answer, moving earlier requests back in time (they must be 5 s apart) and marking them answered. */
async function take(kind = "hint", step = 1, problem = slug, user = USER_A) {
  await t.asOwner()
  await t.query(`update public.coding_coach_requests set created_at = created_at - interval '1 minute', status = case when status = 'pending' then 'answered' else status end`)
  await t.asUser(user)
  return (await t.one<Take>(`select * from public.take_coach_credit($1, $2, $3, $4)`, [problem, kind, step, FP]))!
}
async function grantCredits(n: number, user = USER_A) {
  await t.asOwner()
  await t.query(`insert into public.credit_ledger (user_id, delta, reason) values ($1, $2, 'grant')`, [user, n])
  await t.asUser(user)
}

describe("AI coach", () => {
  it(`free: ${COACH_DAILY.free} a day, then 1 credit each; Pro: ${COACH_DAILY.pro} a day`, async () => {
    for (let i = 1; i <= COACH_DAILY.free; i++) expect(await take("hint", Math.min(i, 3))).toMatchObject({ reason: null, used_today: i, daily: COACH_DAILY.free, paid: false })
    expect(await take()).toMatchObject({ request_id: null, reason: "daily_limit" })

    await grantCredits(1)
    expect(await take()).toMatchObject({ reason: null, paid: true, credits_left: 0 })
    expect(await take()).toMatchObject({ reason: "daily_limit" })
    expect((await t.one<{ reason: string; delta: number }>(`select reason, delta from public.credit_ledger where reason = 'coach'`))).toEqual({ reason: "coach", delta: -1 })

    await t.asOwner()
    await t.query(`insert into public.user_plans (user_id, plan) values ($1, 'pro')`, [USER_B])
    for (let i = 0; i < COACH_DAILY.pro; i++) expect((await take("error", 0, slug, USER_B)).reason).toBeNull()
    expect((await take("error", 0, slug, USER_B)).reason).toBe("daily_limit")
    expect(await t.one(`select * from public.my_coach_allowance()`)).toEqual({ used_today: COACH_DAILY.pro, daily: COACH_DAILY.pro, credits: 0 })
  })

  it("checks the request, and only reviews a solved problem", async () => {
    await t.asAnon()
    expect(await errorOf(t.query(`select * from public.take_coach_credit($1, 'hint', 1, $2)`, [slug, FP]))).toMatch(/permission denied/)
    await t.asUser(USER_A)
    expect((await take("hint", 0)).reason).toBe("bad_request")
    expect((await take("hint", 4)).reason).toBe("bad_request")
    expect((await take("error", 1)).reason).toBe("bad_request")
    expect((await take("explain", 0)).reason).toBe("bad_request")
    expect((await take("hint", 1, "no-such-problem")).reason).toBe("not_found")
    expect((await t.one<Take>(`select * from public.take_coach_credit($1, 'hint', 1, 'not-a-hash')`, [slug]))!.reason).toBe("bad_request")
    expect((await take("review", 0)).reason).toBe("not_solved")

    const total = PROBLEMS[0].tests.length
    await t.query(`select public.submit_code($1, 'python', 'x', $2, $2)`, [slug, total])
    expect((await take("review", 0)).reason).toBeNull()
  })

  it("rejects rapid-fire requests, and failed answers mostly don't count", async () => {
    expect((await take()).reason).toBeNull()
    expect((await t.one<Take>(`select * from public.take_coach_credit($1, 'hint', 2, $2)`, [slug, FP]))!.reason).toBe("slow_down")

    // Two failures a day are forgiven; the third counts.
    const fail = async () => {
      const r = await take()
      await t.query(`update public.coding_coach_requests set status = 'failed' where id = $1`, [r.request_id])
    }
    await fail()
    await fail()
    expect((await take()).used_today).toBe(2)
    await fail()
    expect((await t.one(`select used_today from public.my_coach_allowance()`))).toEqual({ used_today: 3 })
  })

  it("refunds paid answers that fail, up to 2 a day", async () => {
    for (let i = 0; i < COACH_DAILY.free; i++) await take()
    await grantCredits(5)
    for (let i = 0; i < 3; i++) {
      const r = await take()
      expect(r.paid).toBe(true)
      await t.query(`update public.coding_coach_requests set status = 'failed' where id = $1`, [r.request_id])
    }
    await t.asOwner()
    expect((await t.one<{ c: number }>(`select public.credit_balance($1) as c`, [USER_A]))?.c).toBe(4) // 5 − 3 + 2 refunds
  })

  it("learners only read their own rows and only fill in pending ones", async () => {
    const r = await take()
    await t.query(`update public.coding_coach_requests set reply = 'Think about pairs.', status = 'answered', tokens_in = 900, tokens_out = 120 where id = $1`, [r.request_id])
    expect(await errorOf(t.query(`update public.coding_coach_requests set paid = true where id = $1`, [r.request_id]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`insert into public.coding_coach_requests (problem, kind, step, fingerprint) values ($1, 'hint', 1, $2)`, [slug, FP]))).toMatch(/permission denied/)
    await t.query(`update public.coding_coach_requests set status = 'pending', reply = 'changed' where id = $1`, [r.request_id])
    expect((await t.one<{ reply: string }>(`select reply from public.coding_coach_requests where id = $1`, [r.request_id]))?.reply).toBe("Think about pairs.")

    await t.asUser(USER_B)
    expect(await t.query(`select id from public.coding_coach_requests`)).toEqual([])

    // The daily spend cap counts coach tokens too.
    expect(await t.one(`select * from public.professor_tokens_today()`)).toEqual({ tokens_in: 900, tokens_out: 120 })
  })
})
