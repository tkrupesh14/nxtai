// 5.4 C Krpex Code (migration 028): problems, submissions, problem of the day and coding XP.
import { beforeEach, describe, expect, it } from "vitest"

import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

type Result = { id: number; solved: boolean; xp: number; first_try: boolean; daily: boolean }
const testsOf = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!.tests.length
const submit = async (slug: string, passed: number | "all", code = "print(1)", lang = "python") => {
  const total = testsOf(slug)
  return (await t.one<{ r: Result }>(`select public.submit_code($1, $2, $3, $4, $5) as r`, [slug, lang, code, passed === "all" ? total : passed, total]))!.r
}
const xpKeys = async () => (await t.query<{ key: string; points: number }>(`select key, points from public.xp_events order by id`)).map((r) => `${r.key.replace(/\d{4}-\d\d-\d\d/, "D")}=${r.points}`)
const daily = async () => (await t.one<{ p: string }>(`select public.coding_daily_problem() as p`))!.p
const notDaily = async (difficulty: string, n = 1) => {
  const d = await daily()
  return PROBLEMS.filter((p) => p.difficulty === difficulty && p.slug !== d).slice(0, n).map((p) => p.slug)
}

describe("coding practice", () => {
  it("mirrors the problem bank", async () => {
    await t.asAnon()
    const rows = await t.query<{ slug: string; title: string; topic: string; difficulty: string; tests: number }>(
      `select slug, title, topic, difficulty, tests from public.coding_problems where active order by position`,
    )
    expect(rows).toEqual(PROBLEMS.map((p) => ({ slug: p.slug, title: p.title, topic: p.topic, difficulty: p.difficulty, tests: p.tests.length })))
  })

  it("pays XP once per problem: base + first-try bonus, plus the study day", async () => {
    const [easy] = await notDaily("easy")
    const [medium] = await notDaily("medium")
    expect(await submit(easy, "all")).toMatchObject({ solved: true, xp: 20, first_try: true, daily: false }) // 10 + 5 + day 5
    expect(await submit(easy, "all")).toMatchObject({ solved: true, xp: 0, first_try: false })
    expect(await submit(medium, 1)).toMatchObject({ solved: false, xp: 0 })
    expect(await submit(medium, "all", "def f(): pass", "javascript")).toMatchObject({ solved: true, xp: 20, first_try: false })
    expect(await xpKeys()).toEqual([`code:${easy}=15`, "day:D=5", `code:${medium}=20`])
    const subs = await t.query<{ problem: string; solved: boolean; xp: number }>(`select problem, solved, xp from public.coding_submissions order by id`)
    expect(subs).toEqual([
      { problem: easy, solved: true, xp: 15 },
      { problem: easy, solved: true, xp: 0 },
      { problem: medium, solved: false, xp: 0 },
      { problem: medium, solved: true, xp: 20 },
    ])
  })

  it("doubles the problem of the day, which stays the same all day", async () => {
    const p = await daily()
    expect(await daily()).toBe(p)
    await t.asUser(USER_B)
    expect(await daily()).toBe(p)
    const base = { easy: 10, medium: 20, hard: 40 }[PROBLEMS.find((x) => x.slug === p)!.difficulty]!
    expect(await submit(p, "all")).toMatchObject({ daily: true, xp: base * 2 + 5 + 5 })
  })

  it("caps coding XP at 150 a day; a capped problem can still pay on a later solve", async () => {
    const hard = await notDaily("hard", 5)
    const gained = []
    for (const slug of hard) gained.push((await submit(slug, "all")).xp)
    expect(gained).toEqual([50, 45, 45, 15, 0]) // 45 each (+5 study day on the first), then the 150 cap
    expect((await xpKeys()).filter((k) => k.startsWith("code:")).map((k) => Number(k.split("=")[1]))).toEqual([45, 45, 45, 15])
    expect(await t.query(`select 1 from public.xp_events where key = $1`, [`code:${hard[4]}`])).toEqual([])
  })

  it("checks the problem, the result and the code size, and limits submissions to 60 an hour", async () => {
    const [easy] = await notDaily("easy")
    const total = testsOf(easy)
    const call = (args: unknown[]) => errorOf(t.query(`select public.submit_code($1, $2, $3, $4, $5)`, args))
    expect(await call(["no-such-problem", "python", "x", 1, 1])).toMatch(/unknown_problem/)
    expect(await call([easy, "ruby", "x", total, total])).toMatch(/bad_language/)
    expect(await call([easy, "python", "x", total, total + 1])).toMatch(/bad_result/)
    expect(await call([easy, "python", "x", total + 1, total])).toMatch(/bad_result/)
    expect(await call([easy, "python", "x".repeat(20001), total, total])).toMatch(/code_too_long/)
    for (let i = 0; i < 60; i++) await submit(easy, 0)
    expect(await call([easy, "python", "x", 0, total])).toMatch(/rate_limited/)

    await t.asAnon()
    expect(await call([easy, "python", "x", total, total])).toMatch(/not_signed_in|permission denied/)
  })

  it("keeps submissions private and written only through submit_code", async () => {
    const [easy] = await notDaily("easy")
    await submit(easy, "all", "secret code")
    await t.asUser(USER_B)
    expect(await t.query(`select * from public.coding_submissions`)).toEqual([])
    expect(await errorOf(t.query(`insert into public.coding_submissions (user_id, problem, language, code, passed, total) values ($1, $2, 'python', 'x', 1, 1)`, [USER_B, easy]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`insert into public.coding_daily (day, problem) values ('2030-01-01', $1)`, [easy]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`update public.coding_problems set difficulty = 'hard'`))).toMatch(/permission denied/)
    await t.asUser(USER_A)
    expect(await t.query(`select code from public.coding_submissions`)).toEqual([{ code: "secret code" }])
  })
})
