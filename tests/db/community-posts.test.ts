// Community 5b (migration 034): solutions and discussions per problem — posting rules, locked solutions, votes,
// comments, reports and moderation.
import { beforeEach, describe, expect, it } from "vitest"

import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

const USER_C = "00000000-0000-0000-0000-00000000000c"
const USER_D = "00000000-0000-0000-0000-00000000000d"
const ADMIN = "00000000-0000-0000-0000-0000000000ad"
const SPACE = "code:p:two-sum"
const tests = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!.tests.length

let t: TestDb
/** A learner ready to post: handle, level 2 (or more), account a day old. */
async function poster(user: string, handle: string, xp = 60) {
  await t.addUser(user)
  await t.query(`update auth.users set created_at = now() - interval '2 days' where id = $1`, [user])
  await t.query(`insert into public.xp_events (user_id, key, points) select $1, 'test:' || g, least(100, $2 - (g - 1) * 100) from generate_series(1, ceil($2 / 100.0)::int) g`, [user, xp])
  await t.asUser(user)
  await t.query(`select public.save_public_profile($1, $2, '', true, false)`, [handle, handle])
  await t.asOwner()
}
const as = (user: string) => t.asUser(user)
async function solve(slug = "two-sum") {
  await t.query(`select public.submit_code($1, 'python', 'x', $2, $2)`, [slug, tests(slug)])
}
/** Let rate-limit windows pass. */
async function later(seconds = 60) {
  await t.asOwner()
  for (const table of ["community_posts", "community_comments"])
    await t.query(`update public.${table} set created_at = created_at - make_interval(secs => $1)`, [seconds])
}
const create = (kind: string, title = "My approach", body = "Use a hash map.", code: string | null = "def two_sum(n, t): pass", lang: string | null = "python", space = SPACE) =>
  t.query<{ id: string }>(`select public.community_create_post($1, $2, $3, $4, $5, $6, false) as id`, [space, kind, title, body, code, lang]).then((r) => r[0].id)
const list = (kind: string, sort = "top") =>
  t.query<{ r: { locked: boolean; posts: { id: string; score: number; voted: boolean; author: Record<string, unknown> }[]; counts: Record<string, number> } }>(
    `select public.community_list($1, $2, $3) as r`, [SPACE, kind, sort]).then((r) => r[0].r)
const thread = (id: string) =>
  t.query<{ r: Record<string, any> | null }>(`select public.community_thread($1) as r`, [id]).then((r) => r[0].r) // eslint-disable-line @typescript-eslint/no-explicit-any
const vote = (post: string | null, comment: string | null, on = true) =>
  t.query<{ s: number }>(`select public.community_vote($1, $2, $3) as s`, [post, comment, on]).then((r) => r[0].s)
const report = (post: string | null, comment: string | null, reason = "spam") => t.query(`select public.community_report($1, $2, $3, 'note')`, [post, comment, reason])
const notes = (user: string) =>
  t.asOwner().then(() => t.query<{ kind: string; title: string; link: string }>(`select kind, title, link from public.notifications where user_id = $1 order by created_at`, [user]))

beforeEach(async () => {
  t = await createTestDb()
  await poster(USER_A, "asha")
  await poster(USER_B, "ravi")
})

describe("posting rules", () => {
  it("need a handle, level 2, a day-old account and no ban; links from level 4", async () => {
    await t.addUser(USER_C)
    await as(USER_C)
    expect(await errorOf(create("discussion"))).toMatch(/need_handle/)
    await t.query(`select public.save_public_profile('newbie', 'New', '', false, false)`)
    expect(await errorOf(create("discussion"))).toMatch(/account_too_new/)
    await t.asOwner()
    await t.query(`update auth.users set created_at = now() - interval '2 days' where id = $1`, [USER_C])
    await as(USER_C)
    expect(await errorOf(create("discussion"))).toMatch(/need_level_2/)
    expect((await t.query(`select public.community_my_status() as s`))[0]).toEqual({ s: expect.objectContaining({ can_post: false, reason: expect.stringContaining("need_level_2") }) })

    await as(USER_A)
    expect(await errorOf(create("discussion", "Spam", "buy at www.cheap.example"))).toMatch(/links_need_level_4/)
    expect(await errorOf(create("discussion", "ab"))).toMatch(/bad_title/)
    expect(await errorOf(create("discussion", "Question", "  "))).toMatch(/bad_body/)
    expect(await errorOf(create("discussion", "Question", "x", "code", null))).toMatch(/bad_language/)
    expect(await errorOf(create("discussion", "Question", "x", null, null, "code:p:not-a-problem"))).toMatch(/bad_space/)
    const id = await create("discussion", "Why does sorting fail here?", "My idea…", null, null)
    expect(id).toMatch(/[0-9a-f-]{36}/)

    await t.asOwner()
    await t.query(`insert into private.community_bans (user_id, until) values ($1, now() + interval '7 days')`, [USER_A])
    await later()
    await as(USER_A)
    expect(await errorOf(create("discussion"))).toMatch(/banned/)
  })

  it("limit posts to 5 a day, 30 seconds apart", async () => {
    await as(USER_A)
    await create("discussion")
    expect(await errorOf(create("discussion"))).toMatch(/too_fast/)
    for (let i = 0; i < 4; i++) {
      await later(40)
      await as(USER_A)
      await create("discussion")
    }
    await later(40)
    await as(USER_A)
    expect(await errorOf(create("discussion"))).toMatch(/too_many_posts/)
  })

  it("can't write the tables directly", async () => {
    await as(USER_A)
    for (const table of ["community_posts", "community_comments", "community_votes", "community_reports"])
      expect(await errorOf(t.query(`select * from public.${table}`)), table).toMatch(/permission denied/)
    await t.asAnon()
    expect(await errorOf(create("discussion"))).toMatch(/permission denied/)
    expect(await errorOf(vote("00000000-0000-0000-0000-000000000001", null))).toMatch(/permission denied/)
  })
})

describe("solutions", () => {
  it("can only be shared after solving, and stay locked until you solve it or open the official solution", async () => {
    await as(USER_A)
    expect(await errorOf(create("solution"))).toMatch(/solve_first/)
    await solve()
    expect(await errorOf(create("solution", "Hash map", "", null, null))).toMatch(/need_code/)
    const id = await create("solution", "Hash map in one pass", "Store each number's index.")

    await as(USER_B)
    let l = await list("solution")
    expect(l).toMatchObject({ locked: true, posts: [], counts: { solution: 1, discussion: 0 } })
    expect(await thread(id)).toEqual({ locked: true, post: expect.objectContaining({ title: "Hash map in one pass" }) })
    expect(JSON.stringify(await thread(id))).not.toContain("Store each")
    expect(await errorOf(vote(id, null))).toMatch(/locked/)
    expect(await errorOf(t.query(`select public.community_comment($1, null, 'nice')`, [id]))).toMatch(/locked/)
    await t.asAnon()
    expect((await list("solution")).locked).toBe(true)

    await as(USER_B)
    await t.query(`select public.reveal_coding_solution('two-sum')`)
    l = await list("solution")
    expect(l.locked).toBe(false)
    expect(l.posts).toEqual([expect.objectContaining({ id, author: { handle: "asha", name: "asha", level: expect.any(Number), public: true } })])
    expect((await thread(id))!.post).toMatchObject({ body: "Store each number's index.", code: "def two_sum(n, t): pass", language: "python" })
  })
})

describe("votes and comments", () => {
  it("upvote once, not your own; scores and milestones follow", async () => {
    await as(USER_A)
    const id = await create("discussion")
    expect(await errorOf(vote(id, null))).toMatch(/own_post/)
    await as(USER_B)
    expect(await vote(id, null)).toBe(1)
    expect(await vote(id, null)).toBe(1)
    expect((await list("discussion")).posts[0]).toMatchObject({ score: 1, voted: true })
    expect(await vote(id, null, false)).toBe(0)
    expect(await vote(id, null)).toBe(1)
    expect((await notes(USER_A)).filter((n) => n.kind === "community_upvotes")).toEqual([
      { kind: "community_upvotes", title: "Someone upvoted “My approach”", link: `/community/p/two-sum/discuss/${id}` },
    ])
    // A deleted voter's vote goes with them.
    await t.query(`delete from auth.users where id = $1`, [USER_B])
    await as(USER_A)
    expect((await list("discussion")).posts[0].score).toBe(0)
  })

  it("thread replies one level deep, notify the people replied to, and count only visible comments", async () => {
    await poster(USER_C, "meena")
    await as(USER_A)
    const post = await create("discussion")
    await as(USER_B)
    const c1 = (await t.query<{ id: string }>(`select public.community_comment($1, null, 'First!') as id`, [post]))[0].id
    expect(await errorOf(t.query(`select public.community_comment($1, null, 'again')`, [post]))).toMatch(/too_fast/)
    await as(USER_C)
    const c2 = (await t.query<{ id: string }>(`select public.community_comment($1, $2, 'Reply') as id`, [post, c1]))[0].id
    await later(20)
    await as(USER_A)
    const c3 = (await t.query<{ id: string }>(`select public.community_comment($1, $2, 'Reply to reply') as id`, [post, c2]))[0].id
    const th = (await thread(post))!
    expect(th.post.comments).toBe(3)
    expect(th.comments.map((c: { id: string; parent_id: string | null }) => [c.id, c.parent_id])).toEqual([[c1, null], [c2, c1], [c3, c1]])

    // One unread reply notification per post: a newer reply replaces it.
    const replies = async (u: string) => (await notes(u)).filter((n) => n.kind === "community_reply")
    expect((await replies(USER_A)).map((n) => [n.title, n.link])).toEqual([["New reply to “My approach”", `/community/p/two-sum/discuss/${post}#c-${c2}`]])
    expect((await replies(USER_B)).map((n) => [n.title, n.link])).toEqual([["New reply to your comment on “My approach”", `/community/p/two-sum/discuss/${post}#c-${c2}`]])
    expect((await replies(USER_C)).map((n) => [n.title, n.link])).toEqual([["New reply to your comment on “My approach”", `/community/p/two-sum/discuss/${post}#c-${c3}`]])

    // Deleting a comment with replies leaves "[removed]"; without replies it disappears.
    await as(USER_B)
    await t.query(`select public.community_delete_comment($1)`, [c1])
    await as(USER_A)
    const after = (await thread(post))!
    expect(after.post.comments).toBe(2)
    expect(after.comments[0]).toMatchObject({ id: c1, status: "gone", body: null, author: null })
    await t.query(`select public.community_delete_comment($1)`, [c3])
    await as(USER_C)
    await t.query(`select public.community_delete_comment($1)`, [c2])
    expect((await thread(post))!.comments).toEqual([])
  })

  it("let authors edit and delete their own posts only", async () => {
    await as(USER_A)
    const id = await create("discussion")
    await t.query(`select public.community_edit_post($1, 'Better title', 'More detail', null, null, true)`, [id])
    expect((await thread(id))!.post).toMatchObject({ title: "Better title", spoiler: true, edited_at: expect.any(String) })
    await as(USER_B)
    expect(await errorOf(t.query(`select public.community_edit_post($1, 'Mine now', 'x', null, null, false)`, [id]))).toMatch(/not_found/)
    expect(await errorOf(t.query(`select public.community_delete_post($1)`, [id]))).toMatch(/not_found/)
    expect((await list("discussion")).posts[0]).toMatchObject({ excerpt: null, spoiler: true })
    await as(USER_A)
    await t.query(`select public.community_delete_post($1)`, [id])
    expect(await thread(id)).toBeNull()
    expect((await list("discussion")).counts.discussion).toBe(0)
  })
})

describe("reports and moderation", () => {
  it("hide a post after 3 reports from level 2+ learners; admins keep or remove it", async () => {
    await poster(USER_C, "meena")
    await poster(USER_D, "dev")
    await t.addUser(ADMIN)
    await t.query(`insert into private.admins (user_id) values ($1)`, [ADMIN])
    await as(USER_A)
    const id = await create("discussion")
    expect(await errorOf(report(id, null))).toMatch(/own_post/)
    expect(await errorOf(report(id, null, "rude"))).toMatch(/bad_reason/)
    for (const u of [USER_B, USER_C]) {
      await as(u)
      await report(id, null)
      await report(id, null) // twice: counted once
    }
    await as(USER_B)
    expect((await list("discussion")).counts.discussion).toBe(1)
    // A level-1 reporter doesn't count towards hiding.
    await t.asOwner()
    await t.query(`delete from public.xp_events where user_id = $1`, [USER_D])
    await as(USER_D)
    await report(id, null)
    await as(USER_B)
    expect((await list("discussion")).counts.discussion).toBe(1)
    await t.asOwner()
    await t.query(`insert into public.xp_events (user_id, key, points) values ($1, 'test:back', 60)`, [USER_D])
    await t.query(`delete from public.community_reports where reporter = $1`, [USER_D])
    await as(USER_D)
    await report(id, null, "abuse")

    await as(USER_B)
    expect(await thread(id)).toBeNull()
    await as(USER_A)
    expect((await thread(id))!.post.status).toBe("hidden") // the author still sees it

    await as(USER_B)
    expect(await errorOf(t.query(`select public.admin_community_queue()`))).toMatch(/admin only/)
    await as(ADMIN)
    const [{ q }] = await t.query<{ q: { id: string; status: string; reports: unknown[] }[] }>(`select public.admin_community_queue() as q`)
    expect(q).toEqual([expect.objectContaining({ id, status: "hidden", reports: expect.any(Array) })])
    expect(q[0].reports).toHaveLength(3)
    await t.query(`select public.admin_community_moderate('post', $1, 'keep', null)`, [id])
    await as(USER_B)
    expect((await thread(id))!.post.status).toBe("visible")
    await as(ADMIN)
    expect((await t.query<{ q: unknown[] }>(`select public.admin_community_queue() as q`))[0].q).toEqual([])

    await t.query(`select public.admin_community_moderate('post', $1, 'remove', 'Advertising')`, [id])
    await as(USER_B)
    expect(await thread(id)).toBeNull()
    expect((await notes(USER_A)).find((n) => n.kind === "community_removed")).toMatchObject({ title: "A moderator removed your post “My approach”" })
    expect((await notes(ADMIN)).some((n) => n.link === "/admin#community")).toBe(true)

    await as(ADMIN)
    await t.query(`select public.admin_community_ban('asha', 7, 'spam')`)
    await later()
    await as(USER_A)
    expect(await errorOf(create("discussion"))).toMatch(/banned/)
    await as(ADMIN)
    await t.query(`select public.admin_community_ban('asha', 0, null)`)
    await t.query(`select public.admin_set_profile_hidden('asha', true)`)
    await as(USER_A)
    await create("discussion")
    await t.asAnon()
    expect(await t.query(`select public.public_profile('asha') as p`)).toEqual([{ p: null }])
  })

  it("keep posts under [deleted user] when the author's account goes", async () => {
    await as(USER_A)
    const id = await create("discussion")
    await t.asOwner()
    await t.query(`delete from auth.users where id = $1`, [USER_A])
    await as(USER_B)
    expect((await thread(id))!.post.author).toEqual({ deleted: true })
  })
})
