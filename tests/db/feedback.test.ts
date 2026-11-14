// Closed beta B.2 (migration 042): testers send feedback, admins triage and reply.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const SHOT = `${USER_A}/0b0f5c3e-8a43-4c1f-9d55-5a3a3c1e2b77.png`
const submit = (kind = "bug", body = "The Run button does nothing", shot: string | null = null, site = "code") =>
  call(`public.feedback_submit($1, $2, $3, '/p/two-sum', $4, $5)`, [kind, body, site, shot, JSON.stringify({ screen: "390×844", errors: [{ message: "boom" }] })])

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B)
})

describe("feedback", () => {
  it("saves a report with its context, checks what's sent, and tells the admins", async () => {
    await t.asAnon()
    expect(await errorOf(submit())).toMatch(/permission denied|not signed in/)
    await t.asUser(USER_A)
    expect(await errorOf(submit("praise"))).toMatch(/bad kind/)
    expect(await errorOf(submit("bug", "  "))).toMatch(/body required/)
    expect(await errorOf(submit("bug", "x", null, "elsewhere"))).toMatch(/bad site/)
    // A screenshot must be in the sender's own folder.
    expect(await errorOf(submit("bug", "Broken", `${USER_B}/0b0f5c3e-8a43-4c1f-9d55-5a3a3c1e2b77.png`))).toMatch(/bad screenshot/)
    expect(await errorOf(submit("bug", "Broken", `${USER_A}/../x.png`))).toMatch(/bad screenshot/)
    const id = await submit("bug", "  The Run button does nothing  ", SHOT)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await call(`public.feedback_mine()`)).toMatchObject([{ id, kind: "bug", body: "The Run button does nothing", site: "code", path: "/p/two-sum", screenshot: SHOT, status: "new", reply: null }])
    await t.asUser(USER_B)
    expect(await call(`public.feedback_mine()`)).toEqual([])
    expect(await errorOf(call(`public.admin_feedback_list()`))).toMatch(/admin/)
    await t.asOwner()
    expect(await t.query(`select kind, title, link from public.notifications where user_id = $1`, [USER_ADMIN])).toEqual([
      { kind: "admin_feedback", title: "Bug report on Krpex Code", link: "/admin/beta/feedback" },
    ])
    expect(await t.query(`select count(*)::int as n from private.feedback`)).toEqual([{ n: 1 }])
  })

  it("stops at 20 reports a day", async () => {
    await t.asUser(USER_A)
    for (let i = 0; i < 20; i++) await submit("suggestion", `Idea ${i}`)
    expect(await errorOf(submit("suggestion", "One more"))).toMatch(/too many/)
  })

  it("lets admins filter, change the status and reply, and tells the tester", async () => {
    await t.asUser(USER_A)
    const bug = await submit()
    const idea = await submit("suggestion", "Dark mode for the editor", null, "main")
    await t.asUser(USER_ADMIN)
    const list = await call(`public.admin_feedback_list('open', '', '', '', 50, 0)`)
    expect(list.counts).toEqual({ new: 2, planned: 0, in_progress: 0, fixed: 0, wont_fix: 0 })
    expect(list.rows.map((r: { id: string }) => r.id)).toEqual([idea, bug])
    expect(list.rows[1]).toMatchObject({ email: "asha@example.com", context: { screen: "390×844" } })
    expect((await call(`public.admin_feedback_list('open', 'code', '', '', 50, 0)`)).rows).toHaveLength(1)
    expect((await call(`public.admin_feedback_list('all', '', 'suggestion', 'dark', 50, 0)`)).rows).toHaveLength(1)
    expect((await call(`public.admin_feedback_list('all', '', '', 'asha@', 50, 0)`)).total).toBe(2)

    expect(await call(`public.admin_feedback_update($1, 'planned', '')`, [bug])).toBe("ok")
    expect(await call(`public.admin_feedback_update($1, 'in_progress', 'Thanks! Looking into it.')`, [bug])).toBe("ok")
    expect(await call(`public.admin_feedback_update($1, 'in_progress', 'Thanks! Looking into it.')`, [bug])).toBe("ok") // no change, no second notification
    expect(await call(`public.admin_feedback_update($1, 'fixed', '')`, [bug])).toBe("ok")
    expect(await call(`public.admin_feedback_update(gen_random_uuid(), 'fixed', '')`)).toBe("not_found")
    expect(await errorOf(call(`public.admin_feedback_update($1, 'done', '')`, [bug]))).toMatch(/bad status/)

    await t.asUser(USER_A)
    expect(await call(`public.feedback_mine()`)).toMatchObject([{ id: idea, status: "new" }, { id: bug, status: "fixed", reply: "Thanks! Looking into it." }])
    await t.asOwner()
    expect(await t.query(`select kind, title from public.notifications where user_id = $1 order by created_at`, [USER_A])).toEqual([
      { kind: "feedback_reply", title: "Krpex replied to your feedback" },
      { kind: "feedback_fixed", title: "Fixed: something you reported" },
    ])
    expect(await t.query(`select action from private.admin_log where user_id = $1 order by id`, [USER_A])).toEqual([
      { action: "feedback:planned" },
      { action: "feedback:in_progress" },
      { action: "feedback:fixed" },
    ])
  })
})
