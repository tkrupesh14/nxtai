// Admin 6.6 (migration 040): starts (deploys, restarts, rollbacks), health checks with downtime, and errors by range.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const start = (commit: string | null, subject = "x") => t.query(`select public.app_log_start($1, $2, $3, now(), false)`, [SERVER_KEY, commit, subject])
const check = (minutesAgo: number, ok = true, ms = 120) =>
  t.query(`select public.app_log_health($1, now() - make_interval(mins => $2), $3, $4, $5, 300, 'abc1234')`, [SERVER_KEY, minutesAgo, ok, ok ? "ok" : "unreachable", ms])

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A)
})

describe("admin system", () => {
  it("needs the server key to log and an admin to read", async () => {
    await t.asAnon()
    expect(await errorOf(t.query(`select public.app_log_start('wrong', 'abc', 'x', now(), false)`))).toBeTruthy()
    expect(await errorOf(t.query(`select public.app_log_health('wrong', now(), true, 'ok', 1, 1, 'abc')`))).toBeTruthy()
    expect(await errorOf(call(`public.admin_system(24)`))).toMatch(/permission denied/)
    await t.asUser(USER_A)
    expect(await errorOf(call(`public.admin_system(24)`))).toMatch(/admin only/)
    expect(await errorOf(call(`public.admin_error_groups(now() - interval '1 day')`))).toMatch(/admin only/)
    expect(await errorOf(t.query(`select * from private.health_checks`))).toMatch(/permission denied/)
  })

  it("tells deploys from restarts and rollbacks", async () => {
    await t.asAnon()
    await start("aaa1111", "First")
    await start("bbb2222", "Second")
    await start("bbb2222", "Second")
    await start("aaa1111", "First")
    await start(null)
    await t.asUser(USER_ADMIN)
    const s = await call(`public.admin_system(24)`)
    expect(s.starts.map((x: { kind: string; commit: string | null }) => [x.kind, x.commit])).toEqual([
      ["unknown", null],
      ["rollback", "aaa1111"],
      ["restart", "bbb2222"],
      ["deploy", "bbb2222"],
      ["deploy", "aaa1111"],
    ])
  })

  it("summarises health checks and finds downtime", async () => {
    await t.asAnon()
    // Every 5 minutes for the last 2 hours, except none from 90 to 60 minutes ago (55 → 95: 40 minutes apart), and one failed check.
    for (let m = 120; m >= 0; m -= 5) if (m < 60 || m > 90) await check(m, m !== 20, m === 20 ? 5000 : 100)
    await t.asUser(USER_ADMIN)
    const s = await call(`public.admin_system(24)`)
    expect(s).toMatchObject({ failed: 1, max_ms: 5000, max_rss_mb: 300, last_check: { ok: true, commit: "abc1234" } })
    expect(s.checks).toBe(18)
    expect(s.downtime).toHaveLength(1)
    expect(s.downtime[0].minutes).toBe(40)
    expect(Number(s.down_minutes)).toBe(35) // the gap less one normal 5-minute interval
    expect(s.failures).toEqual([expect.objectContaining({ database: "unreachable", ms: 5000 })])
  })

  it("keeps late checks' time, but no more than a day back", async () => {
    await t.asAnon()
    await t.query(`select public.app_log_health($1, now() - interval '3 days', true, 'ok', 1, 1, null)`, [SERVER_KEY])
    await t.query(`select public.app_log_health($1, now() + interval '3 days', true, 'ok', 1, 1, null)`, [SERVER_KEY])
    await t.asOwner()
    expect(await t.query(`select (at < now() - interval '23 hours') as old, (at <= now()) as past from private.health_checks order by at`)).toEqual([
      { old: true, past: true },
      { old: false, past: true },
    ])
  })

  it("reports the server down when checks stop", async () => {
    await t.asAnon()
    await check(40)
    await t.asUser(USER_ADMIN)
    const s = await call(`public.admin_system(24)`)
    expect(s.downtime).toEqual([expect.objectContaining({ to: null })])
  })

  it("groups errors in a range, by source and search", async () => {
    await t.query(
      `insert into public.app_errors (source, message, path, detail, created_at) values
         ('server', 'TypeError: x is undefined', 'GET /learn', 'stack 1', now() - interval '2 hours'),
         ('server', 'TypeError: x is undefined', 'GET /learn/abc', 'stack 2', now() - interval '1 hour'),
         ('client', 'ChunkLoadError', '/code/p/two-sum', null, now() - interval '30 minutes'),
         ('client', 'Old error', '/', null, now() - interval '10 days')`,
    )
    await t.asUser(USER_ADMIN)
    const day = await call(`public.admin_error_groups(now() - interval '1 day')`)
    expect(day).toMatchObject({ total: 3, server: 2, client: 1 })
    expect(day.groups.map((g: { message: string; count: number }) => [g.message, g.count])).toEqual([
      ["ChunkLoadError", 1],
      ["TypeError: x is undefined", 2],
    ])
    expect(day.groups[1]).toMatchObject({ paths: 2, last_path: "GET /learn/abc", last_detail: "stack 2" })
    expect((await call(`public.admin_error_groups(now() - interval '1 day', null, 'server')`)).total).toBe(2)
    expect((await call(`public.admin_error_groups(now() - interval '1 day', null, 'all', 'two-SUM')`)).total).toBe(1)
    expect((await call(`public.admin_error_groups(now() - interval '1 day', null, 'all', '100%_')`)).total).toBe(0)
    expect((await call(`public.admin_error_groups(now() - interval '30 days')`)).total).toBe(4)
    expect((await call(`public.admin_error_groups(now() - interval '30 days', now() - interval '1 day')`)).groups).toEqual([
      expect.objectContaining({ message: "Old error" }),
    ])
  })
})
