// Community 5a (migration 033): public profiles — handle rules, privacy, and what a public page returns.
import { beforeEach, describe, expect, it } from "vitest"

import { hasLink, HANDLE_RE, isReservedHandle } from "@/lib/community/profile"
import { xpLevel } from "@/lib/learning/xp"
import { PROBLEMS } from "@/lib/code/problems"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

const save = (handle: string, opts: { name?: string; bio?: string; pub?: boolean; solves?: boolean } = {}) =>
  t.query<{ r: Record<string, unknown> }>(`select public.save_public_profile($1, $2, $3, $4, $5) as r`, [
    handle,
    opts.name ?? "Asha",
    opts.bio ?? "",
    opts.pub ?? true,
    opts.solves ?? false,
  ])
const profile = async (handle: string) =>
  (await t.query<{ r: Record<string, unknown> | null }>(`select public.public_profile($1) as r`, [handle]))[0].r
const giveXp = async (user: string, points: number) => {
  await t.asOwner()
  for (let i = 0; points > 0; i++, points -= 100)
    await t.query(`insert into public.xp_events (user_id, key, points) values ($1, $2, $3)`, [user, `test:${points}:${i}`, Math.min(points, 100)])
  await t.asUser(user)
}
const tests = (slug: string) => PROBLEMS.find((p) => p.slug === slug)!.tests.length

describe("public profiles", () => {
  it("claim a handle; handles are unique, lower case and follow the format", async () => {
    const [{ r }] = await save("  Asha_K  ")
    expect(r).toMatchObject({ handle: "asha_k", display_name: "Asha", is_public: true, hidden: false })
    expect(r).not.toHaveProperty("email")
    for (const bad of ["ab", "_asha", "asha_", "asha-k", "a".repeat(21), "asha k", "आशा"])
      expect(await errorOf(save(bad))).toMatch(/bad_handle/)
    for (const reserved of ["admin", "support", "krpex_fan", "the_official", "moderator1"])
      expect(await errorOf(save(reserved))).toMatch(/reserved_handle/)

    await t.asUser(USER_B)
    expect(await errorOf(save("ASHA_K"))).toMatch(/handle_taken/)
    expect((await t.query(`select public.handle_available('asha_k') as ok`))[0]).toEqual({ ok: false })
    expect((await t.query(`select public.handle_available('ravi') as ok`))[0]).toEqual({ ok: true })
    expect((await t.query(`select public.handle_available('a!') as ok`))[0]).toEqual({ ok: null })
  })

  it("change the handle at most once every 30 days; other fields any time", async () => {
    await save("asha")
    await save("asha", { name: "Asha K", bio: "Learning DSA" })
    expect(await errorOf(save("asha2"))).toMatch(/handle_change_too_soon/)
    await t.asOwner()
    await t.query(`update public.public_profiles set handle_changed_at = now() - interval '31 days'`)
    await t.asUser(USER_A)
    await save("asha2")
    expect(await errorOf(save("asha3"))).toMatch(/handle_change_too_soon/)
    // The old handle is free again.
    await t.asUser(USER_B)
    await save("asha")
  })

  it("check names and bios; links only from level 4", async () => {
    expect(await errorOf(save("asha", { name: "   " }))).toMatch(/bad_name/)
    expect(await errorOf(save("asha", { name: "x".repeat(41) }))).toMatch(/bad_name/)
    expect(await errorOf(save("asha", { name: "Krpex Team" }))).toMatch(/bad_name/)
    expect(await errorOf(save("asha", { bio: "x".repeat(161) }))).toMatch(/bad_bio/)
    expect(await errorOf(save("asha", { bio: "see my blog at asha.dev" }))).toMatch(/links_need_level_4/)
    expect(await errorOf(save("asha", { name: "www.spam.example" }))).toMatch(/links_need_level_4/)
    await giveXp(USER_A, 299) // level 3
    expect(await errorOf(save("asha", { bio: "https://asha.dev" }))).toMatch(/links_need_level_4/)
    await giveXp(USER_A, 1) // 300 → level 4
    const [{ r }] = await save("asha", { name: "  Asha   K ", bio: "Blog:\n https://asha.dev" })
    expect(r).toMatchObject({ display_name: "Asha K", bio: "Blog: https://asha.dev" })
  })

  it("are private by default and can't be written directly", async () => {
    await save("asha", { pub: false })
    expect(await profile("asha")).toBeNull()
    expect(await errorOf(t.query(`update public.public_profiles set hidden = false`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`insert into public.public_profiles (user_id, handle, display_name) values ($1, 'zz_top', 'x')`, [USER_A]))).toMatch(/permission denied/)
    await t.asUser(USER_B)
    expect(await t.query(`select * from public.public_profiles`)).toEqual([])
    await t.asAnon()
    expect(await errorOf(t.query(`select * from public.public_profiles`))).toMatch(/permission denied/)
    expect(await errorOf(save("anon_user"))).toMatch(/permission denied/)
  })

  it("show progress publicly, never code or email; recent solves only when chosen; hidden pages vanish", async () => {
    await t.query(`select public.submit_code('two-sum', 'python', 'secret code', $1, $1)`, [tests("two-sum")])
    await t.query(`select public.submit_code('fizzbuzz', 'python', 'x', 0, $1)`, [tests("fizzbuzz")])
    await save("asha")
    await t.asAnon()
    const p = (await profile("ASHA"))!
    expect(p).toMatchObject({ handle: "asha", display_name: "Asha", solved: { easy: 0, medium: 1, hard: 0 }, recent: null, plans: [] })
    expect(Number(p.xp)).toBeGreaterThan(0)
    expect(Object.values(p.activity as Record<string, number>)).toEqual([2])
    expect((p.study_days as string[]).length).toBe(1)
    const text = JSON.stringify(p)
    expect(text).not.toMatch(/secret code|@example\.com/)
    expect(text).not.toContain(USER_A)

    await t.asUser(USER_A)
    await save("asha", { solves: true })
    await t.asAnon()
    expect((await profile("asha"))!.recent).toEqual([expect.objectContaining({ problem: "two-sum" })])
    expect(await t.query(`select public.public_profile_handles() as h`)).toEqual([{ h: "asha" }])

    await t.asOwner()
    await t.query(`update public.public_profiles set hidden = true`)
    await t.asAnon()
    expect(await profile("asha")).toBeNull()
    expect(await t.query(`select public.public_profile_handles() as h`)).toEqual([])
  })

  it("go when the account is deleted", async () => {
    await save("asha")
    await t.asOwner()
    await t.query(`delete from auth.users where id = $1`, [USER_A])
    expect(await t.query(`select * from public.public_profiles`)).toEqual([])
  })

  it("use the same rules as lib/community/profile.ts", async () => {
    await t.asOwner()
    for (const total of [0, 49, 50, 149, 150, 299, 300, 499, 500, 2250, 2449, 2450, 9999, 100000])
      expect((await t.query<{ l: number }>(`select private.xp_level($1::int) as l`, [total]))[0].l).toBe(xpLevel(total).level)
    const samples = ["hello", "asha.dev", "see www.x", "http://a", "e.g. arrays", "3.14 is pi", "node.js", "x.in", "a.co.", "notalink.comet", "mail me", "abc.COM"]
    for (const s of samples) expect((await t.query<{ l: boolean }>(`select private.has_link($1) as l`, [s]))[0].l, s).toBe(hasLink(s))
    for (const h of ["asha", "admin", "krpexer", "help", "helper", "official_x", "mods", "moderna"]) {
      const db = (await t.query<{ r: boolean }>(`select private.reserved_handle($1) as r`, [h]))[0].r
      expect(db, h).toBe(isReservedHandle(h))
    }
    for (const h of ["ab1", "a_b", "_ab", "ab_", "a".repeat(20), "a".repeat(21), "AB1"]) {
      const db = (await t.query<{ ok: boolean }>(`select $1 ~ '^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$' as ok`, [h]))[0].ok
      expect(db, h).toBe(HANDLE_RE.test(h))
    }
  })
})
