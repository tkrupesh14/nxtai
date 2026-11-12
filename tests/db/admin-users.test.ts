// Admin 6.2 (migration 036): the paged users list, one learner's page and the audit log.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
type ListRow = { id: string; email: string; handle: string | null; plan: string; credits: number; courses: number; level: number; solved: number; banned: boolean }
const list = async (args: { search?: string; plan?: string; active?: string; sort?: string; limit?: number; offset?: number } = {}) =>
  (await t.one<{ r: { total: number; rows: ListRow[] } }>(`select public.admin_user_list($1, $2, $3, $4, $5, $6) as r`, [
    args.search ?? "",
    args.plan ?? "all",
    args.active ?? "all",
    args.sort ?? "joined",
    args.limit ?? 50,
    args.offset ?? 0,
  ]))!.r
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const user = async (id: string) => (await t.one<{ r: any }>(`select public.admin_user($1) as r`, [id]))!.r

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B, "ravi@example.com")
  await t.query(`update auth.users set created_at = now() - interval '3 days', last_sign_in_at = now() - interval '1 day' where id = $1`, [USER_A])
  await t.query(`update auth.users set created_at = now() - interval '60 days', last_sign_in_at = now() - interval '40 days' where id = $1`, [USER_B])
  await t.query(`update auth.users set created_at = now() - interval '90 days' where id = $1`, [USER_ADMIN])
})

describe("admin users", () => {
  it("are for admins only", async () => {
    await t.asUser(USER_A)
    for (const sql of [`select public.admin_user_list()`, `select public.admin_user('${USER_B}')`, `select public.admin_audit()`]) {
      expect(await errorOf(t.query(sql))).toMatch(/admin only/)
    }
    await t.asAnon()
    expect(await errorOf(t.query(`select public.admin_user_list()`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select * from private.admin_log`))).toMatch(/permission denied/)
  })

  it("list newest first with filters, search and pages", async () => {
    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_grant('ravi@example.com', 0, 30, 'test')`)
    const all = await list()
    expect(all.total).toBe(3)
    expect(all.rows.map((r) => r.email)).toEqual(["asha@example.com", "ravi@example.com", "admin@example.com"])
    expect((await list({ plan: "pro" })).rows.map((r) => r.email)).toEqual(["ravi@example.com"])
    expect((await list({ active: "7d" })).rows.map((r) => r.email)).toEqual(["asha@example.com"])
    expect((await list({ active: "quiet" })).rows.map((r) => r.email)).toEqual(["ravi@example.com", "admin@example.com"])
    expect((await list({ sort: "seen" })).rows.map((r) => r.email)).toEqual(["asha@example.com", "ravi@example.com", "admin@example.com"])
    expect((await list({ search: "RAVI" })).rows.map((r) => r.email)).toEqual(["ravi@example.com"])
    const page2 = await list({ limit: 2, offset: 2 })
    expect(page2).toMatchObject({ total: 3, rows: [{ email: "admin@example.com" }] })
    expect(all.rows[0]).toMatchObject({ plan: "free", credits: 0, courses: 0, level: 1, solved: 0, banned: false, handle: null })
  })

  it("show one learner's account, money, learning, code and community", async () => {
    await t.asUser(USER_A)
    const { lessonIds } = await t.createCourse(2)
    await t.writeLesson(lessonIds[0])
    await t.query(`select public.save_public_profile('asha', 'Asha', '', true, false)`)
    await t.asOwner()
    await t.query(`insert into public.payment_orders (user_id, razorpay_order_id, product, amount_paise, status, paid_at) values ($1, 'order_1', 'c100', 4900, 'paid', now())`, [USER_A])
    await t.query(`insert into public.coding_submissions (user_id, problem, language, code, passed, total) select $1, slug, 'python', 'x', tests, tests from public.coding_problems order by position limit 1`, [USER_A])

    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_grant('asha@example.com', 25, 0, 'support')`)
    await t.query(`select public.admin_community_ban('asha', 7, 'spam')`)
    const u = await user(USER_A)
    expect(u.account).toMatchObject({ id: USER_A, email: "asha@example.com", admin: false, professor: null })
    expect(u.plan).toMatchObject({ plan: "free" })
    expect(u.credits).toBe(25)
    expect(u.ledger[0]).toMatchObject({ delta: 25, reason: "grant", note: "support" })
    expect(u.courses).toHaveLength(1)
    expect(u.courses[0]).toMatchObject({ title: "Test course", lessons: 2, passed: 0, certificate: null })
    expect(u.ai).toMatchObject({ lessons_written: 1, courses_created: 1, questions: 0, coach: 0 })
    expect(u.payments).toMatchObject([{ product: "c100", amount_paise: 4900, status: "paid" }])
    expect(u.code).toMatchObject({ solved: 1, submissions: 1 })
    expect(u.code.recent[0]).not.toHaveProperty("code")
    expect(u.community.profile).toMatchObject({ handle: "asha", is_public: true, hidden: false })
    expect(u.community.ban).toMatchObject({ reason: "spam" })
    expect(u.audit.map((a: { action: string }) => a.action)).toEqual(["ban:7", "grant"])
    expect(u.audit[1]).toMatchObject({ admin: "admin@example.com", email: "asha@example.com", detail: { credits: 25, note: "support" } })

    expect(await user("00000000-0000-0000-0000-000000000999")).toBeNull()
    expect((await list({ search: "asha" })).rows[0]).toMatchObject({ handle: "asha", credits: 25, courses: 1, solved: 1, banned: true })
  })

  it("keep an audit log of grants and moderation, newest first", async () => {
    await t.asUser(USER_A)
    await t.query(`select public.save_public_profile('asha', 'Asha', '', true, false)`)
    await t.asUser(USER_ADMIN)
    expect(await t.one(`select public.admin_grant('nobody@example.com', 5, 0, '') as r`)).toEqual({ r: "not_found" })
    await t.query(`select public.admin_grant('ravi@example.com', -5, 7, '')`)
    await t.query(`select public.admin_set_profile_hidden('asha', true)`)
    const log = (await t.one<{ r: { action: string; email: string; detail: Record<string, unknown> }[] }>(`select public.admin_audit() as r`))!.r
    expect(log.map((l) => [l.action, l.email])).toEqual([
      ["hide_profile", "asha@example.com"],
      ["grant", "ravi@example.com"],
    ])
    expect(log[1].detail).toEqual({ credits: -5, pro_days: 7 })
    // The learner still hears about Pro, as before.
    await t.asOwner()
    expect((await t.query(`select kind from public.notifications where user_id = $1`, [USER_B])).map((n) => n.kind)).toEqual(["pro_granted"])
  })
})
