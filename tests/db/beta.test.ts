// Closed beta B.1 (migration 041): apply, approve or decline, and what the database refuses without access.
import { beforeEach, describe, expect, it } from "vitest"

import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const apply = (consent = true, goal = "Learn Python for my exams") =>
  call(`public.beta_apply('Asha  Rao', 'college', $1, 'android', 'A friend', $2)`, [goal, consent])
const status = () => call(`public.beta_my_status()`)

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B)
  await t.query(`update private.admin_settings set beta_closed = true`)
})

describe("closed beta", () => {
  it("lets a learner apply once, with consent, and wait", async () => {
    await t.asUser(USER_A)
    expect(await status()).toMatchObject({ closed: true, signed_in: true, access: false, beta_tester: false, application: null })
    expect(await errorOf(apply(false))).toMatch(/consent required/)
    expect(await errorOf(apply(true, "  "))).toMatch(/goal required/)
    expect(await errorOf(call(`public.beta_apply('A', 'pilot', 'x', 'android', '', true)`))).toMatch(/bad role/)
    expect(await apply()).toBe("ok")
    expect(await apply(true, "Changed my mind: SQL")).toBe("ok") // a waiting application can be changed
    expect(await status()).toMatchObject({ access: false, application: { status: "waiting", name: "Asha Rao", goal: "Changed my mind: SQL", device: "android" } })
    await t.asOwner()
    // Admins hear about it once.
    expect(await t.query(`select kind, title from public.notifications where user_id = $1`, [USER_ADMIN])).toEqual([
      { kind: "admin_beta_application", title: "New beta application: Asha Rao" },
    ])
    await t.asAnon()
    expect(await status()).toMatchObject({ closed: true, signed_in: false, access: false })
    expect(await errorOf(apply())).toMatch(/permission denied/)
  })

  it("approving gives access, Pro once and a notification; declining takes access away", async () => {
    await t.asUser(USER_A)
    await apply()
    expect(await errorOf(call(`public.admin_beta_decide($1, 'approved')`, [USER_A]))).toMatch(/admin only/)
    await t.asUser(USER_ADMIN)
    const list = await call(`public.admin_beta_list('waiting', 'asha')`)
    expect(list).toMatchObject({ closed: true, total: 1, counts: { waiting: 1, approved: 0 }, rows: [{ email: "asha@example.com", role: "college", plan: "free" }] })
    expect(await call(`public.admin_beta_decide($1, 'approved', 'Good fit', 30)`, [USER_A])).toBe("ok")
    expect(await call(`public.admin_beta_decide($1, 'approved', '', 30)`, [USER_B])).toBe("not_found")

    await t.asUser(USER_A)
    expect(await status()).toMatchObject({ access: true, beta_tester: true, application: { status: "approved" } })
    await t.asOwner()
    expect(await call(`public.current_plan($1)`, [USER_A])).toBe("pro")
    const end1 = (await t.one<{ e: string }>(`select current_period_end::text as e from public.user_plans where user_id = $1`, [USER_A]))!.e
    expect(await t.query(`select kind from public.notifications where user_id = $1`, [USER_A])).toEqual([{ kind: "beta_approved" }])

    // Declined, then approved again: no second Pro grant.
    await t.asUser(USER_ADMIN)
    await call(`public.admin_beta_decide($1, 'declined')`, [USER_A])
    await t.asUser(USER_A)
    expect(await status()).toMatchObject({ access: false, application: { status: "declined" } })
    expect(await apply()).toBe("declined")
    await t.asUser(USER_ADMIN)
    await call(`public.admin_beta_decide($1, 'approved', '', 30)`, [USER_A])
    await t.asOwner()
    expect((await t.one<{ e: string }>(`select current_period_end::text as e from public.user_plans where user_id = $1`, [USER_A]))!.e).toBe(end1)
    expect((await t.query<{ action: string }>(`select action from private.admin_log order by id`)).map((r) => r.action)).toEqual([
      "beta:approved",
      "beta:declined",
      "beta:approved",
    ])
  })

  it("refuses courses, questions, code and community writes without access", async () => {
    await t.asUser(USER_A)
    expect(await errorOf(t.createCourse())).toMatch(/beta access required/)
    expect(await errorOf(t.query(`select public.submit_code($1, 'python', 'x', $2, $2)`, [PROBLEMS[0].slug, PROBLEMS[0].tests.length]))).toMatch(/beta access required/)
    expect(await errorOf(t.query(`select public.save_public_profile('asha_r', 'Asha', '', true, false)`))).toMatch(/beta access required/)
    // Admins and approved professors are in without applying.
    await t.asUser(USER_ADMIN)
    await t.createCourse()
    await t.asOwner()
    await t.query(`insert into public.professors (user_id, subject, display_name, status, agreement_version) values ($1, 'science/physics', 'Prof B', 'approved', 'v1')`, [USER_B])
    await t.asUser(USER_B)
    expect(await status()).toMatchObject({ access: true, beta_tester: false })
    // Opening the beta lets everyone in.
    await t.asUser(USER_ADMIN)
    await call(`public.admin_set_beta_closed(false)`)
    await t.asUser(USER_A)
    expect(await status()).toMatchObject({ closed: false, access: true })
    await t.createCourse()
    expect(await apply()).toBe("open")
  })

  it("hides community reading without access", async () => {
    await t.asUser(USER_ADMIN)
    await call(`public.admin_set_beta_closed(false)`)
    await t.asUser(USER_B)
    await call(`public.save_public_profile('bina', 'Bina', '', true, false)`)
    await t.asUser(USER_ADMIN)
    await call(`public.admin_set_beta_closed(true)`)

    await t.asAnon()
    expect(await call(`public.public_profile('bina')`)).toBeNull()
    expect(await call(`public.community_feed()`)).toEqual([])
    expect(await call(`public.community_list('board:help', 'discussion')`)).toBeNull()
    expect(await t.query(`select * from public.public_profile_handles()`)).toEqual([])
    expect(await errorOf(t.query(`select private.community_feed_open()`))).toMatch(/permission denied/)

    await t.asUser(USER_ADMIN)
    expect(await call(`public.public_profile('bina')`)).toMatchObject({ handle: "bina", beta_tester: false })
    expect(await call(`public.community_list('board:help', 'discussion')`)).not.toBeNull()
    expect((await t.query(`select * from public.public_profile_handles()`)).length).toBe(0) // no sitemap during the beta
    expect((await call(`public.admin_beta_list('existing')`)).counts).toMatchObject({ existing: 0 })
  })
})
