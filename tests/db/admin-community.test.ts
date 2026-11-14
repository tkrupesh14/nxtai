// Admin 6.3 (migration 037): the filtered moderation queue, bans, the moderation history, boards on/off, and the
// professor and lesson-report actions in the audit log.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
async function poster(user: string, email: string, handle: string) {
  await t.addUser(user, email)
  await t.query(`update auth.users set created_at = now() - interval '2 days' where id = $1`, [user])
  await t.query(`insert into public.xp_events (user_id, key, points) values ($1, $2, 60)`, [user, `test:${user}`])
  await t.asUser(user)
  await t.query(`select public.save_public_profile($1, $2, '', true, false)`, [handle, handle])
  await t.asOwner()
}
const post = async (user: string, title: string, space = "board:help") => {
  await t.asUser(user)
  const id = await call(`public.community_create_post($1, 'discussion', $2, 'Some words here', null, null, false)`, [space, title])
  await t.asOwner()
  await t.query(`update public.community_posts set created_at = created_at - interval '2 minutes'`)
  return id as string
}

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await poster(USER_A, "asha@example.com", "asha")
  await poster(USER_B, "ravi@example.com", "ravi")
})

describe("admin community", () => {
  it("is for admins only", async () => {
    await t.asUser(USER_A)
    for (const sql of [
      `public.admin_community_queue('all')`,
      `public.admin_community_bans()`,
      `public.admin_community_log()`,
      `public.admin_community_boards()`,
      `public.admin_set_board_active('help', false)`,
    ]) {
      expect(await errorOf(call(sql))).toMatch(/admin only/)
    }
    await t.asAnon()
    expect(await errorOf(call(`public.admin_community_boards()`))).toMatch(/permission denied/)
  })

  it("filters the queue by reported or hidden", async () => {
    const reported = await post(USER_A, "Reported once")
    const hidden = await post(USER_A, "Hidden by reports")
    await post(USER_A, "Fine post")
    await t.query(`insert into public.community_reports (reporter, post_id, reason) values ($1, $2, 'spam')`, [USER_B, reported])
    await t.query(`update public.community_posts set status = 'hidden' where id = $1`, [hidden])
    await t.asUser(USER_ADMIN)
    const ids = async (show: string) => ((await call(`public.admin_community_queue($1)`, [show])) as { id: string }[]).map((i) => i.id)
    expect(await ids("all")).toEqual([reported, hidden])
    expect(await ids("reported")).toEqual([reported])
    expect(await ids("hidden")).toEqual([hidden])
    expect(await ids("nonsense")).toEqual([reported, hidden])
    expect((await call(`public.admin_community_queue()`))[0]).toMatchObject({ author_id: USER_A, author_email: "asha@example.com" })
  })

  it("lists bans in force and the moderation history", async () => {
    const id = await post(USER_A, "Buy my course")
    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_community_ban('asha', 7, 'spam')`)
    await t.query(`select public.admin_community_ban('ravi', null, 'abuse')`)
    await t.query(`select public.admin_community_ban('ravi', 0, '')`)
    await t.query(`select public.admin_community_moderate('post', $1, 'remove', 'Advertising')`, [id])
    expect(await call(`public.admin_community_bans()`)).toEqual([
      expect.objectContaining({ handle: "asha", email: "asha@example.com", reason: "spam", by: "admin@example.com" }),
    ])
    const log = await call(`public.admin_community_log()`)
    expect(log.map((l: { action: string }) => l.action)).toEqual(["remove", "unban", "ban:forever", "ban:7"])
    expect(log[0]).toMatchObject({ admin: "admin@example.com", email: "asha@example.com", detail: { reason: "Advertising", title: "Buy my course" } })
    expect(log[0].detail.path).toMatch(/^\/community\/c\/help\//)
    expect(await call(`public.admin_community_log(1, 1)`)).toMatchObject([{ action: "unban" }])
  })

  it("turns a board off and on", async () => {
    await post(USER_A, "First question")
    await t.asUser(USER_ADMIN)
    expect((await call(`public.admin_community_boards()`)).find((b: { slug: string }) => b.slug === "help")).toMatchObject({ active: true, posts: 1, hidden: 0 })
    await t.query(`select public.admin_set_board_active('help', false)`)
    expect(await errorOf(call(`public.admin_set_board_active('nope', false)`))).toMatch(/not_found/)

    await t.asAnon()
    expect((await call(`public.community_boards()`)).map((b: { slug: string }) => b.slug)).not.toContain("help")
    await t.asUser(USER_B)
    expect(await errorOf(call(`public.community_create_post('board:help', 'discussion', 'Another one', 'Words', null, null, false)`))).toBeTruthy()

    await t.asUser(USER_ADMIN)
    expect((await call(`public.admin_community_boards()`)).find((b: { slug: string }) => b.slug === "help")).toMatchObject({ active: false })
    await t.query(`select public.admin_set_board_active('help', true)`)
    const log = await call(`public.admin_community_log()`)
    expect(log.map((l: { action: string; detail: { board: string } }) => [l.action, l.detail.board])).toEqual([
      ["board_on", "help"],
      ["board_off", "help"],
    ])
  })

  it("logs professor and lesson-report actions in the audit log", async () => {
    await t.query(`insert into public.professors (user_id, subject, display_name, agreement_version, listing_requested) values ($1, 'science/physics', 'Dr Ravi', 'v1', true)`, [USER_B])
    const prof = (await t.one<{ id: string }>(`select id from public.professors where user_id = $1`, [USER_B]))!.id
    await t.asUser(USER_A)
    const { lessonIds } = await t.createCourse(1)
    await t.asOwner()
    await t.query(`insert into public.lesson_reports (user_id, lesson_id, reason) values ($1, $2, 'wrong')`, [USER_A, lessonIds[0]])
    const report = (await t.one<{ id: string }>(`select id from public.lesson_reports`))!.id

    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_set_professor_status($1, 'approved')`, [prof])
    await t.query(`select public.admin_set_professor_status($1, 'approved')`, [prof]) // no change, no line
    await t.query(`select public.admin_set_professor_live($1, true)`, [prof])
    await t.query(`select public.admin_resolve_report($1)`, [report])
    await t.query(`select public.admin_resolve_report($1)`, [report])
    const token = await call(`public.admin_create_professor_invite('new.prof@example.com', 'science/physics')`)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    await t.asOwner()
    const invite = (await t.one<{ id: string }>(`select id from private.professor_invites`))!.id
    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_revoke_professor_invite($1)`, [invite])

    const log = (await call(`public.admin_audit()`)) as { action: string; email: string | null; detail: Record<string, unknown> }[]
    expect(log.map((l) => [l.action, l.email])).toEqual([
      ["professor_invite_revoked", null],
      ["professor_invite", null],
      ["resolve_report", "asha@example.com"],
      ["professor_listed", "ravi@example.com"],
      ["professor:approved", "ravi@example.com"],
    ])
    expect(log[1].detail).toEqual({ email: "new.prof@example.com", subject: "science/physics" })
    expect(JSON.stringify(log)).not.toContain(token)
    expect(log[2].detail).toEqual({ reason: "wrong", lesson: expect.any(String) })
    expect((await call(`public.admin_user($1)`, [USER_B])).audit.map((a: { action: string }) => a.action)).toEqual(["professor_listed", "professor:approved"])
  })
})
