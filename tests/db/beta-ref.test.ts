// Closed beta (migration 045): which shared link an application came from, and the per-link counts admins see.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const apply = (ref: string | null) => call(`public.beta_apply('Asha', 'college', 'Python', 'android', '', true, $1)`, [ref])

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.addUser(USER_B, "bala@example.com")
  await t.query(`update private.admin_settings set beta_closed = true`)
})

describe("beta links", () => {
  it("keeps the first valid link and counts applications per link", async () => {
    await t.asUser(USER_A)
    expect(await apply(" PyDelhi ")).toBe("ok")
    expect(await apply("college-xyz")).toBe("ok") // changing the application keeps the first link
    await t.asUser(USER_B)
    expect(await apply("<script>")).toBe("ok") // not a link name: ignored
    // The old six-argument call still works (the app before this release).
    expect(await call(`public.beta_apply('Bala', 'working', 'Go', 'computer', '', true)`)).toBe("ok")

    await t.asOwner()
    expect(await t.query(`select user_id, ref from private.beta_testers order by ref nulls last`)).toEqual([
      { user_id: USER_A, ref: "pydelhi" },
      { user_id: USER_B, ref: null },
    ])

    await t.asUser(USER_ADMIN)
    await call(`public.admin_beta_decide($1, 'approved', '', 0)`, [USER_A])
    await t.asUser(USER_A)
    await call(`public.activity_record($1)`, [JSON.stringify([{ site: "main", path: "/learn", started_at: new Date().toISOString(), seconds: 5 }])])

    await t.asUser(USER_ADMIN)
    const all = await call(`public.admin_beta_list('all', '', 50, 0)`)
    expect(all.sources).toEqual([
      { ref: "pydelhi", applied: 1, waiting: 0, approved: 1, active_7d: 1 },
      { ref: null, applied: 1, waiting: 1, approved: 0, active_7d: 0 },
    ])
    const found = await call(`public.admin_beta_list('all', 'pydelhi', 50, 0)`)
    expect(found.rows.map((r: { email: string; ref: string }) => [r.email, r.ref])).toEqual([["asha@example.com", "pydelhi"]])
  })
})

describe("beta WhatsApp number", () => {
  it("tidies the number, refuses a bad one and keeps it when an update leaves it out", async () => {
    const wa = (n: string | null) => call(`public.beta_apply('Asha', 'college', 'Python', 'android', '', true, null, $1)`, [n])
    await t.asUser(USER_A)
    expect(await wa("+91 98765-43210")).toBe("ok")
    await expect(wa("12345")).rejects.toThrow(/bad whatsapp/)
    expect(await wa(null)).toBe("ok") // the older app: the number stays
    expect((await call(`public.beta_my_status()`)).application.whatsapp).toBe("+919876543210")
    await t.asUser(USER_ADMIN)
    const found = await call(`public.admin_beta_list('all', '98765', 50, 0)`)
    expect(found.rows.map((r: { whatsapp: string }) => r.whatsapp)).toEqual(["+919876543210"])
  })
})
