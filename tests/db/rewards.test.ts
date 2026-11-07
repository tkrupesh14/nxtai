// 5.7b streak freezes and level rewards (migration 027).
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
})

/** Give USER_A XP directly (as the owner); the reward trigger runs as it would for a real reward. */
const giveXp = async (points: number, key: string) => {
  await t.asOwner()
  await t.query(`insert into public.xp_events (user_id, key, points) values ($1, $2, $3)`, [USER_A, key, points])
}
const studied = async (daysAgo: number) => {
  await t.asOwner()
  await t.query(`select private.award_day_xp($1, now() - make_interval(days => $2))`, [USER_A, daysAgo])
}
const freezes = async () => {
  await t.asOwner()
  return t.query<{ key: string; used: boolean }>(`select key, used_for is not null as used from public.streak_freezes where user_id = $1 order by id`, [USER_A])
}

describe("level rewards", () => {
  it("gives each reward once on reaching the level, with a notification", async () => {
    await giveXp(100, "a")
    await giveXp(50, "b") // 150 XP = level 3
    await t.asOwner()
    expect(await t.query(`select level from public.level_rewards order by level`)).toEqual([{ level: 2 }, { level: 3 }])
    expect(await t.query(`select delta, note from public.credit_ledger where user_id = $1`, [USER_A])).toEqual([{ delta: 10, note: "Level 3 reward" }])
    expect(await freezes()).toEqual([{ key: "level:2", used: false }])
    expect((await t.query<{ title: string }>(`select title from public.notifications where kind = 'level_reward' order by title`)).map((r) => r.title)).toEqual([
      "Level 2! You earned a streak freeze",
      "Level 3! You earned 10 bonus credits",
    ])

    await giveXp(100, "c")
    await giveXp(100, "d") // 350 = level 4: nothing new
    await t.asOwner()
    expect(await t.query(`select count(*)::int as n from public.credit_ledger`)).toEqual([{ n: 1 }])

    await giveXp(100, "e")
    await giveXp(100, "f")
    for (let i = 0; i < 18; i++) await giveXp(100, `g${i}`) // 2350 = level 10
    await t.asOwner()
    expect(await t.query(`select level from public.level_rewards order by level`)).toEqual([2, 3, 5, 7, 10].map((level) => ({ level })))
    expect(await t.query(`select sum(delta)::int as n from public.credit_ledger`)).toEqual([{ n: 55 }])
    expect(await t.one(`select plan, current_period_end > now() + interval '6 days' as week from public.user_plans where user_id = $1`, [USER_A])).toEqual({
      plan: "pro",
      week: true,
    })

    await t.asUser(USER_B)
    expect(await t.query(`select level from public.level_rewards`)).toEqual([])
    expect(await errorOf(t.query(`insert into public.level_rewards (user_id, level) values ($1, 10)`, [USER_B]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select private.grant_level_rewards($1)`, [USER_B]))).toMatch(/permission denied/)
  })

  it("lets a learner without Pro use the free certificate once", async () => {
    await t.asUser(USER_A)
    const one = await t.createCourse(1)
    const two = await t.createCourse(1)
    await t.asOwner()
    for (const c of [one.courseId, two.courseId]) {
      await t.query(`insert into public.assessments (course_id, user_id, kind, best_score, passed_at) values ($1, $2, 'final', 90, now())`, [c, USER_A])
    }
    const claim = async (c: string) => {
      await t.asUser(USER_A)
      return (await t.one<{ r: { code?: string; error?: string } }>(`select public.issue_certificate($1, 'Asha Rao') as r`, [c]))!.r
    }
    expect(await claim(one.courseId)).toEqual({ error: "pro_only" })

    for (let i = 0; i < 23; i++) await giveXp(100, `x${i}`) // level 10
    await t.asOwner()
    await t.query(`update public.user_plans set current_period_end = now() - interval '1 day' where user_id = $1`, [USER_A])
    expect((await claim(one.courseId)).code).toMatch(/^[0-9A-F]{12}$/)
    expect(await claim(two.courseId)).toEqual({ error: "pro_only" })
  })
})

describe("streak freezes", () => {
  it("earns one for a 7-day streak and holds at most two", async () => {
    for (let d = 6; d >= 0; d--) await studied(d)
    expect(await freezes()).toEqual([{ key: expect.stringMatching(/^streak:/), used: false }])
    await t.asOwner()
    await t.query(`select private.give_freeze($1, 'x'), private.give_freeze($1, 'y')`, [USER_A])
    expect(await freezes()).toHaveLength(2)
  })

  it("covers a missed day so the streak keeps going, and tells the learner", async () => {
    await studied(3)
    await studied(2)
    await t.asOwner()
    await t.query(`select private.give_freeze($1, 'level:2')`, [USER_A])
    await t.asAnon()
    const run = async () => (await t.one<{ n: number }>(`select public.app_use_streak_freezes($1) as n`, [SERVER_KEY]))!.n
    expect(await run()).toBe(1)
    expect(await run()).toBe(0)
    expect(await freezes()).toEqual([{ key: "level:2", used: true }])
    await t.asOwner()
    expect(await t.query(`select title from public.notifications where kind = 'reminder_freeze_used'`)).toEqual([
      { title: "Streak freeze used: your 3-day streak is safe" },
    ])

    // The 7 pm reminder counts the frozen day.
    await t.asAnon()
    expect((await t.one<{ n: number }>(`select public.app_create_reminders($1) as n`, [SERVER_KEY]))!.n).toBe(1)
    await t.asOwner()
    expect(await t.query(`select title from public.notifications where kind = 'reminder_streak'`)).toEqual([{ title: "Keep your 3-day streak going" }])
    expect(await errorOf(t.query(`select public.app_use_streak_freezes('wrong')`))).toMatch(/server key/)
  })

  it("isn't used when there is no streak to save", async () => {
    await studied(5)
    await t.asOwner()
    await t.query(`select private.give_freeze($1, 'level:2')`, [USER_A])
    await t.asAnon()
    expect((await t.one<{ n: number }>(`select public.app_use_streak_freezes($1) as n`, [SERVER_KEY]))!.n).toBe(0)
  })
})
