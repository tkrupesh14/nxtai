// Community 5c (migration 035): boards, the cross-board feed and the professor label.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

const PROF = "00000000-0000-0000-0000-0000000000cf"

let t: TestDb
/** A learner ready to post: handle, level 2, account a day old. */
async function poster(user: string, handle: string) {
  await t.addUser(user)
  await t.query(`update auth.users set created_at = now() - interval '2 days' where id = $1`, [user])
  await t.query(`insert into public.xp_events (user_id, key, points) values ($1, $2, 60)`, [user, `test:${user}`])
  await t.asUser(user)
  await t.query(`select public.save_public_profile($1, $2, '', true, false)`, [handle, handle])
  await t.asOwner()
}
const create = (space: string, kind = "discussion", title = "How do I start?", body = "Where should I begin?") =>
  t.query<{ id: string }>(`select public.community_create_post($1, $2, $3, $4, null, null, false) as id`, [space, kind, title, body]).then((r) => r[0].id)
const feed = (scope: string | null) =>
  t.query<{ r: { id: string; space: string; author: Record<string, unknown> }[] }>(`select public.community_feed($1) as r`, [scope]).then((r) => r[0].r)
async function later() {
  await t.asOwner()
  await t.query(`update public.community_posts set created_at = created_at - interval '1 minute'`)
}

beforeEach(async () => {
  t = await createTestDb()
  await poster(USER_A, "asha")
  await poster(USER_B, "ravi")
})

describe("boards", () => {
  it("take discussions on active boards only", async () => {
    await t.asUser(USER_A)
    const id = await create("board:help")
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    await later()
    await t.asUser(USER_A)
    expect(await errorOf(create("board:help", "solution"))).toMatch(/bad_space/)
    expect(await errorOf(create("board:nope"))).toMatch(/bad_space/)
    expect(await errorOf(create("course:physics"))).toMatch(/bad_space/)
    await t.asOwner()
    await t.query(`update public.community_boards set active = false where slug = 'science'`)
    await t.asUser(USER_A)
    expect(await errorOf(create("board:science"))).toMatch(/bad_space/)
  })

  it("list boards with counts and keep the table itself private", async () => {
    await t.asUser(USER_A)
    await create("board:interviews")
    await t.asAnon()
    const boards = (await t.one<{ r: { slug: string; kind: string; posts: number; last_activity: string | null }[] }>(`select public.community_boards() as r`))!.r
    expect(boards.map((b) => b.slug)).toEqual(["help", "interviews", "projects", "feedback", "coding", "it-cloud", "ai-data", "science", "math", "business", "design", "languages", "exam-prep"])
    expect(boards.find((b) => b.slug === "interviews")).toMatchObject({ kind: "general", posts: 1 })
    expect(boards.find((b) => b.slug === "help")).toMatchObject({ posts: 0, last_activity: null })
    expect(await errorOf(t.query(`select * from public.community_boards`))).toMatch(/permission denied/)
  })

  it("send reply notifications to the board thread", async () => {
    await t.asUser(USER_A)
    const id = await create("board:science")
    await t.asUser(USER_B)
    await t.query(`select public.community_comment($1, null, 'Try the Mechanics course first.')`, [id])
    await t.asOwner()
    const n = await t.one<{ link: string }>(`select link from public.notifications where user_id = $1 and kind = 'community_reply'`, [USER_A])
    expect(n?.link).toMatch(new RegExp(`^/community/c/science/${id}#c-`))
  })
})

describe("feed", () => {
  it("shows the latest active discussions by scope, never solutions or hidden posts", async () => {
    await t.asUser(USER_A)
    const help = await create("board:help")
    await later()
    await t.asUser(USER_A)
    const physics = await create("board:science")
    await later()
    await t.asUser(USER_A)
    const problem = await create("code:p:two-sum")
    await t.asOwner()
    // A comment moves a thread to the top.
    await t.asUser(USER_B)
    await t.query(`select public.community_comment($1, null, 'Same question here.')`, [help])

    await t.asAnon()
    expect((await feed(null)).map((p) => p.id)).toEqual([help, problem, physics])
    expect((await feed("code")).map((p) => p.id)).toEqual([help, problem])
    expect((await feed("courses")).map((p) => p.id)).toEqual([physics])
    expect(await feed("other")).toEqual([])

    await t.asOwner()
    await t.query(`update public.community_posts set status = 'hidden' where id = $1`, [help])
    await t.asAnon()
    expect((await feed(null)).map((p) => p.id)).toEqual([problem, physics])
  })
})

describe("professors", () => {
  it("are labelled, and may post without the level and account-age rules", async () => {
    await t.addUser(PROF)
    await t.asUser(PROF)
    await t.query(`select public.save_public_profile('drmeera', 'Dr Meera', '', true, false)`)
    expect(await errorOf(create("board:science"))).toMatch(/account_too_new/)
    await t.asOwner()
    await t.query(`insert into public.professors (user_id, subject, display_name, agreement_version, status) values ($1, 'science/physics', 'Dr Meera', 'v1', 'approved')`, [PROF])
    await t.asUser(PROF)
    const id = await create("board:science", "discussion", "Office hours", "See https://example.com for notes")
    await t.asAnon()
    const post = (await t.one<{ r: { post: { author: Record<string, unknown> } } }>(`select public.community_thread($1) as r`, [id]))!.r.post
    expect(post.author).toMatchObject({ handle: "drmeera", professor: true })
    expect((await feed(null))[0].author).toMatchObject({ professor: true })

    await t.asOwner()
    await t.query(`update public.professors set status = 'suspended' where user_id = $1`, [PROF])
    await t.asAnon()
    expect((await feed(null))[0].author).toMatchObject({ professor: false })
  })

  it("learners are not labelled professors", async () => {
    await t.asUser(USER_A)
    await create("board:help")
    await t.asAnon()
    expect((await feed(null))[0].author).toMatchObject({ handle: "asha", professor: false })
  })
})
