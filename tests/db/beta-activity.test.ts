// Closed beta B.3 (migration 044): page visits for consenting testers, and what admins see.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
const record = (views: unknown) => call(`public.activity_record($1)`, [JSON.stringify(views)])

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B)
  await t.query(`update private.admin_settings set beta_closed = true`)
  // USER_A applied, agreed and was approved; USER_B is an account from before the beta (never agreed to tracking).
  await t.asUser(USER_A)
  await call(`public.beta_apply('Asha Rao', 'college', 'Python', 'android', '', true)`)
  await t.asUser(USER_ADMIN)
  await call(`public.admin_beta_decide($1, 'approved', '', 0)`, [USER_A])
  await t.asOwner()
  await t.query(`insert into private.beta_testers (user_id, source, status) values ($1, 'existing', 'approved')`, [USER_B])
})

describe("beta activity", () => {
  it("records pages only for testers who agreed, while the beta is closed", async () => {
    await t.asUser(USER_B)
    expect(await call(`public.activity_tracking()`)).toBe(false)
    expect(await record([{ site: "main", path: "/learn", started_at: ago(5), seconds: 30 }])).toBe(false)

    await t.asUser(USER_A)
    expect(await call(`public.activity_tracking()`)).toBe(true)
    expect(
      await record([
        { site: "main", path: "/learn?token=secret", started_at: ago(10), seconds: 40 },
        { site: "code", path: "/p/two-sum", came_from: "/problems?x=1", started_at: ago(9), seconds: 99999 },
        { site: "elsewhere", path: "/x", started_at: ago(8), seconds: 1 }, // skipped
        { site: "main", path: "no-slash", started_at: ago(8), seconds: 1 }, // skipped
        { site: "main", path: "/old", started_at: ago(60 * 24 * 3), seconds: 1 }, // too old: skipped
        "nonsense",
      ]),
    ).toBe(true)
    await t.asOwner()
    expect(await t.query(`select site, path, came_from, seconds from private.page_views order by started_at`)).toEqual([
      { site: "main", path: "/learn", came_from: null, seconds: 40 },
      { site: "code", path: "/p/two-sum", came_from: "/problems", seconds: 3600 },
    ])
    await t.asUser(USER_A)
    expect(await errorOf(t.query(`select * from private.page_views`))).toMatch(/permission denied/)

    // The beta has ended: nothing more is recorded.
    await t.asOwner()
    await t.query(`update private.admin_settings set beta_closed = false`)
    await t.asUser(USER_A)
    expect(await record([{ site: "main", path: "/learn", started_at: ago(1), seconds: 5 }])).toBe(false)
  })

  it("shows admins the funnel, sites, pages and one tester's timeline", async () => {
    await t.asUser(USER_A)
    const id = "3f2b1c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d"
    await record([
      { site: "main", path: `/learn/courses/${id}`, started_at: ago(200), seconds: 60 },
      { site: "main", path: "/learn", started_at: ago(198), seconds: 30 }, // session 1 ends here
      { site: "code", path: "/problems", started_at: ago(60), seconds: 20 },
      { site: "community", path: "/c", came_from: "/problems", started_at: ago(59), seconds: 10 }, // session 2 ends here
    ])
    await t.asOwner()
    await t.query(`insert into public.learner_profiles (user_id, goal, level) values ($1, 'Learn Python', 'beginner')`, [USER_A])

    await t.asUser(USER_A)
    expect(await errorOf(call(`public.admin_beta_activity(30)`))).toMatch(/admin/)
    await t.asUser(USER_ADMIN)
    const all = await call(`public.admin_beta_activity(30)`)
    expect(all.funnel).toEqual({ applied: 1, approved: 1, signed_in: 1, onboarded: 1, lesson_opened: 0, lesson_finished: 0, day_2: 0, week_2: 0 })
    expect(all.sites).toMatchObject({ main: 1, code: 1, community: 1, two_or_more: 1, all_three: 1, code_submitted: 0 })
    expect(all.pages).toContainEqual({ site: "main", page: "/learn/courses/:id", views: 1, testers: 1, avg_seconds: 60, exits: 0 })
    expect(all.pages).toContainEqual({ site: "main", page: "/learn", views: 1, testers: 1, avg_seconds: 30, exits: 1 })
    expect(all.pages).toContainEqual({ site: "community", page: "/c", views: 1, testers: 1, avg_seconds: 10, exits: 1 })
    expect(all.testers).toMatchObject([{ user_id: USER_A, name: "Asha Rao", views: 4, active_days: 1 }])

    const one = await call(`public.admin_beta_tester_activity($1, 30)`, [USER_A])
    expect(one.tester).toMatchObject({ name: "Asha Rao", email: "asha@example.com", status: "approved", active_days: 1 })
    expect(one.events.map((e: { kind: string; title: string }) => `${e.kind} ${e.title}`)).toEqual([
      "onboarding Finished onboarding",
      "page /c",
      "page /problems",
      "page /learn",
      `page /learn/courses/${id}`,
    ])
    expect(await call(`public.admin_beta_tester_activity(gen_random_uuid(), 30)`)).toBeNull()
  })
})
