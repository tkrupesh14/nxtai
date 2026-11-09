// Krpex Code v2 Phase 4 (migration 032): study plans mirror lib/code/plans.ts and pay a bonus once when finished.
import { beforeEach, describe, expect, it } from "vitest"

import { PLANS, planProblems } from "@/lib/code/plans"
import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

const tests = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!.tests.length
/** Solve problems as the current user (moving earlier submissions back an hour so the rate limit never bites). */
async function solve(slugs: string[], passed?: number) {
  for (const s of slugs) {
    await t.query(`select public.submit_code($1, 'python', 'x', $2, $3)`, [s, passed ?? tests(s), tests(s)])
  }
}
const planXp = async (user = USER_A) =>
  (await t.query<{ key: string; points: number }>(`select key, points from public.xp_events where user_id = $1 and key like 'plan:%'`, [user]))

describe("study plans", () => {
  it("mirror lib/code/plans.ts", async () => {
    await t.asAnon()
    const rows = await t.query<{ slug: string; title: string; problems: string[]; bonus: number }>(`select slug, title, problems, bonus from public.coding_plans where active order by position`)
    expect(rows).toEqual(PLANS.map((p) => ({ slug: p.slug, title: p.title, problems: planProblems(p), bonus: p.bonus })))
  })

  it("pay the bonus once, when the last problem is solved", async () => {
    const plan = PLANS.find((p) => p.slug === "dynamic-programming")!
    const all = planProblems(plan)
    await solve(all.slice(0, -1))
    await solve([all.at(-1)!], 0) // a failed try doesn't finish it
    expect(await planXp()).toEqual([])
    await solve([all.at(-1)!])
    expect(await planXp()).toEqual([{ key: "plan:dynamic-programming", points: plan.bonus }])
    await solve([all[0]])
    expect(await planXp()).toHaveLength(1)

    await t.asUser(USER_B)
    expect(await planXp(USER_B)).toEqual([])
  })

  it("follow up to 5, and following a plan already finished pays its bonus", async () => {
    const plan = PLANS.find((p) => p.slug === "dynamic-programming")!
    // Finished before the plan existed: no bonus row yet.
    await solve(planProblems(plan))
    await t.asOwner()
    await t.query(`delete from public.xp_events where key like 'plan:%'`)
    await t.asUser(USER_A)

    await t.query(`select public.follow_coding_plan('dynamic-programming', true)`)
    expect(await planXp()).toEqual([{ key: "plan:dynamic-programming", points: plan.bonus }])
    await t.query(`select public.follow_coding_plan('dynamic-programming', true)`) // again: no-op
    expect(await t.query(`select plan from public.coding_plan_follows`)).toEqual([{ plan: "dynamic-programming" }])
    await t.query(`select public.follow_coding_plan('dynamic-programming', false)`)
    expect(await t.query(`select plan from public.coding_plan_follows`)).toEqual([])

    await t.asOwner()
    for (let i = 0; i < 2; i++)
      await t.query(`insert into public.coding_plans (slug, title, problems, bonus, position) values ($1, 'x', array['two-sum'], 1, 99)`, [`extra-${i}`])
    await t.asUser(USER_A)
    for (const slug of [...PLANS.map((p) => p.slug), "extra-0"].slice(0, 5)) await t.query(`select public.follow_coding_plan($1, true)`, [slug])
    expect(await errorOf(t.query(`select public.follow_coding_plan('extra-1', true)`))).toMatch(/too_many_plans/)
    expect(await errorOf(t.query(`select public.follow_coding_plan('nope', true)`))).toMatch(/unknown_plan/)
  })

  it("can't be changed by learners or followed signed out", async () => {
    expect(await errorOf(t.query(`insert into public.coding_plan_follows (user_id, plan) values ($1, 'krpex-150')`, [USER_A]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`update public.coding_plans set bonus = 100`))).toMatch(/permission denied/)
    await t.asAnon()
    expect(await errorOf(t.query(`select public.follow_coding_plan('krpex-150', true)`))).toMatch(/permission denied/)
  })
})
