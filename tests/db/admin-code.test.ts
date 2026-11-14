// Admin 6.5 (migration 039): Krpex Code — per-problem submissions and acceptance, stuck and untried problems,
// the coach, and runner errors.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

const USER_C = "00000000-0000-0000-0000-00000000000c"
let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const code = async (days = 30) => (await t.one<{ r: any }>(`select public.admin_code($1) as r`, [days]))!.r
const submit = (user: string, problem: string, solved: boolean, lang = "python", ago = "0 hours") =>
  t.query(
    `insert into public.coding_submissions (user_id, problem, language, code, passed, total, created_at)
     select $1, slug, $3, 'x', case when $4 then tests else 0 end, tests, now() - $5::interval from public.coding_problems where slug = $2`,
    [user, problem, lang, solved, ago],
  )

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  for (const u of [USER_A, USER_B, USER_C]) await t.addUser(u)
})

describe("admin code", () => {
  it("is for admins only", async () => {
    await t.asUser(USER_A)
    expect(await errorOf(code())).toMatch(/admin only/)
    await t.asAnon()
    expect(await errorOf(code())).toMatch(/permission denied/)
  })

  it("counts submissions and acceptance per problem, and finds stuck and untried problems", async () => {
    const [p1, p2] = (await t.query<{ slug: string }>(`select slug from public.coding_problems where active order by position limit 2`)).map((r) => r.slug)
    await submit(USER_A, p1, false)
    await submit(USER_A, p1, true)
    await submit(USER_B, p1, false, "javascript")
    await submit(USER_A, p2, false)
    await submit(USER_B, p2, false)
    await submit(USER_C, p2, false)
    await submit(USER_C, p2, true, "python", "40 days") // outside 30 days
    await t.query(`insert into public.coding_reveals (user_id, problem) values ($1, $2)`, [USER_B, p2])
    await t.query(
      `insert into public.coding_coach_requests (user_id, problem, kind, step, fingerprint, status, paid, tokens_in, tokens_out) values
         ($1, $2, 'hint', 1, repeat('a', 64), 'answered', false, 1000, 100),
         ($1, $2, 'review', 0, repeat('b', 64), 'failed', true, 0, 0)`,
      [USER_B, p2],
    )
    await t.query(`insert into public.app_errors (source, message, path) values ('client', 'Code runner: Worker error: boom', '/p/x'), ('client', 'Code runner: Worker error: boom', '/p/y'), ('client', 'Something else', null)`)

    await t.asUser(USER_ADMIN)
    const c = await code()
    expect(c).toMatchObject({ days: 30, submissions: 6, accepted: 1, learners: 3, solvers: 1, problems_solved: 1, languages: { python: 5, javascript: 1 } })
    expect(c.daily).toHaveLength(30)
    expect(c.daily[0]).toMatchObject({ submissions: 6, accepted: 1, learners: 3, coach: 2 })
    expect(c.problems.slice(0, 2)).toEqual([
      // Same number of submissions: in problem order.
      expect.objectContaining({ slug: p1, submissions: 3, accepted: 1, tried: 2, solvers: 1 }),
      expect.objectContaining({ slug: p2, submissions: 3, accepted: 0, tried: 3, solvers: 0, reveals: 1, coach: 2 }),
    ])
    expect(c.stuck).toEqual([expect.objectContaining({ slug: p2, tried: 3, solvers: 0 })])
    expect(c.never_tried.map((p: { slug: string }) => p.slug)).not.toContain(p1)
    expect(c.never_tried.map((p: { slug: string }) => p.slug)).not.toContain(p2)
    expect(c.coach).toMatchObject({ requests: 2, learners: 1, failed: 1, paid: 1 })
    expect(Number(c.coach.inr)).toBeGreaterThan(0)
    expect(c.coach.kinds).toEqual(expect.arrayContaining([{ kind: "hint", requests: 1, answered: 1, failed: 0, paid: 0 }]))
    expect(c.runner_errors).toEqual([expect.objectContaining({ message: "Code runner: Worker error: boom", count: 2 })])

    expect((await code(90)).submissions).toBe(7)
  })
})
