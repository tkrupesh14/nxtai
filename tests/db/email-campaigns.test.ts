// Email campaigns (migration 047): import, audience, claiming within the daily cap, SES events, tracking,
// unsubscribe, auto-pause and results.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, type TestDb } from "../support/db"

let t: TestDb
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = async (sql: string, args: unknown[] = []) => (await t.one<{ r: any }>(`select ${sql} as r`, args))!.r
const rows = (n: number, prefix = "s") => JSON.stringify(Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}@example.com`, name: `S${i}` })))

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.addUser(USER_A, "asha@example.com")
  await t.query(`update private.admin_settings set email_send_from = null, email_send_to = null`) // any time of day, unless a test sets hours
})

async function campaign(tags: string[] = []) {
  await t.asUser(USER_ADMIN)
  const id = await call(`public.admin_email_campaign_save(null, 'Beta invite', 'beta-invite', 'Join the beta', 'Pro free', 'Hi {{name}}', 'Krpex', $1)`, [tags])
  return id as string
}

describe("email campaigns", () => {
  it("imports contacts (admins only), merging tags and skipping bad rows", async () => {
    await t.asUser(USER_A)
    expect(await errorOf(call(`public.admin_email_import('x', '', '', '{}', '[]')`))).toMatch(/admin/)
    await t.asUser(USER_ADMIN)
    const r = await call(`public.admin_email_import('30 Days of Code, 2023', 'Signed up on our form', 'f.csv', '{30dc, Bad Tag!}', $1, '{"duplicates": 2}')`, [
      JSON.stringify([{ email: " Asha@Example.com ", name: "Asha", college: "IIT" }, { email: "broken@gmail" }, { email: "b@example.com" }]),
    ])
    expect(r).toMatchObject({ added: 2, updated: 0, invalid: 1 })
    const again = await call(`public.admin_email_import('Later list', '', '', '{college}', $1)`, [JSON.stringify([{ email: "asha@example.com", name: "Other" }])])
    expect(again).toMatchObject({ added: 0, updated: 1 })
    const list = await call(`public.admin_email_contacts('asha', '', 50, 0)`)
    expect(list.rows).toMatchObject([{ email: "asha@example.com", name: "Asha", tags: ["30dc", "college"], source: "30 Days of Code, 2023" }])
    const o = await call(`public.admin_email_overview()`)
    expect(o).toMatchObject({ contacts: 2, sendable: 2, today: { sent: 0, cap: 100 } })
    expect(o.imports[1].counts).toMatchObject({ duplicates: 2, added: 2 })
  })

  it("sends to the audience within the daily cap, records events and pauses on bounces", async () => {
    await t.asUser(USER_ADMIN)
    await call(`public.admin_email_import('List', '', '', '{a}', $1)`, [rows(130)])
    await call(`public.admin_email_import('Other', '', '', '{b}', $1)`, [rows(5, "o")])
    await t.asOwner()
    await t.query(`insert into private.email_suppressions (email, reason) values ('s0@example.com', 'unsubscribed')`)
    const id = await campaign(["a"])
    expect((await call(`public.admin_email_campaign($1)`, [id])).audience).toBe(129)
    expect(await call(`public.admin_email_campaign_set($1, 'start')`, [id])).toBe("ok")
    expect(await call(`public.admin_email_campaign_set($1, 'start')`, [id])).toBe("bad_state")

    await t.asUser(USER_A)
    expect(await errorOf(call(`public.app_email_claim('wrong', 10)`))).toMatch(/server/)
    const batch = await call(`public.app_email_claim($1, 60)`, [SERVER_KEY])
    expect(batch).toHaveLength(60)
    expect(batch[0]).not.toHaveProperty("source")
    expect(batch[0]).toMatchObject({ email: "s1@example.com", name: "S1", campaign: { slug: "beta-invite", subject: "Join the beta" } })
    for (const [i, b] of batch.entries()) await call(`public.app_email_sent($1, $2, $3)`, [SERVER_KEY, b.id, `msg-${i}`])
    // 40 more fit under today's cap of 100; the rest wait for tomorrow.
    expect(await call(`public.app_email_claim($1, 100)`, [SERVER_KEY])).toHaveLength(40)
    expect(await call(`public.app_email_claim($1, 100)`, [SERVER_KEY])).toHaveLength(0)

    // Tracking, unsubscribe and SES events.
    expect(await call(`public.app_email_track($1, $2, 'open')`, [SERVER_KEY, batch[0].token])).toBe(true)
    expect(await call(`public.app_email_track($1, $2, 'click')`, [SERVER_KEY, batch[1].token])).toBe(true)
    expect(await call(`public.app_email_track($1, 'nope', 'open')`, [SERVER_KEY])).toBe(false)
    expect(await call(`public.app_email_unsubscribe($1, $2)`, [SERVER_KEY, batch[2].token])).toBe("ok")
    expect(await call(`public.app_email_event($1, 'msg-3', 'delivery')`, [SERVER_KEY])).toBe(true)
    expect(await call(`public.app_email_event($1, 'msg-4', 'complaint', 's5@example.com')`, [SERVER_KEY])).toBe(true)
    expect(await call(`public.app_email_event($1, 'unknown', 'bounce')`, [SERVER_KEY])).toBe(false)

    await t.asUser(USER_ADMIN)
    let one = await call(`public.admin_email_campaign($1, 'all', 200, 0)`, [id])
    expect(one.stats).toMatchObject({ recipients: 129, sent: 60, queued: 69, opened: 2, clicked: 1, unsubscribed: 1, delivered: 1, complained: 1 })
    expect(one.campaign.status).toBe("sending")
    expect((await call(`public.admin_email_campaign($1, 'clicked')`, [id])).rows.map((r: { email: string }) => r.email)).toEqual(["s2@example.com"])

    // Four bounces out of 60 (> 5%) pause the campaign and tell the admins.
    await t.asUser(USER_A)
    for (const i of [10, 11, 12, 13]) await call(`public.app_email_event($1, $2, 'bounce')`, [SERVER_KEY, `msg-${i}`])
    await t.asUser(USER_ADMIN)
    one = await call(`public.admin_email_campaign($1)`, [id])
    expect(one.campaign.status).toBe("paused")
    expect(one.campaign.paused_reason).toMatch(/4 bounced and 1 complained out of 60/)
    await t.asOwner()
    expect(await t.query(`select reason, count(*)::int as n from private.email_suppressions group by reason order by reason`)).toEqual([
      { reason: "bounced", n: 4 },
      { reason: "complained", n: 1 },
      { reason: "unsubscribed", n: 2 },
    ])
    expect(await t.one(`select count(*)::int as n from public.notifications where kind = 'admin_email_paused'`)).toEqual({ n: 1 })

    // Resuming judges health again from now; stopping skips whoever is still waiting.
    await t.asUser(USER_ADMIN)
    expect(await call(`public.admin_email_campaign_set($1, 'resume')`, [id])).toBe("ok")
    expect(await call(`public.admin_email_campaign_set($1, 'stop')`, [id])).toBe("ok")
    one = await call(`public.admin_email_campaign($1)`, [id])
    expect(one.campaign.status).toBe("done")
    expect(one.stats.skipped).toBeGreaterThan(0)
  })

  it("counts sign-ups and beta applications after the email", async () => {
    await t.asUser(USER_ADMIN)
    await call(`public.admin_email_import('List', '', '', '{}', $1)`, [JSON.stringify([{ email: "new@example.com" }])])
    const id = await campaign()
    await call(`public.admin_email_campaign_set($1, 'start')`, [id])
    await t.asUser(USER_A)
    const [b] = await call(`public.app_email_claim($1, 5)`, [SERVER_KEY])
    await call(`public.app_email_sent($1, $2, 'm1')`, [SERVER_KEY, b.id])
    await t.asOwner()
    await t.query(`update private.email_sends set sent_at = now() - interval '1 hour'`)
    await t.addUser("00000000-0000-0000-0000-00000000000c", "new@example.com")
    await t.query(`update private.admin_settings set beta_closed = true`)
    await t.asUser("00000000-0000-0000-0000-00000000000c")
    await call(`public.beta_apply('New', 'college', 'Python', 'android', '', true, 'email-beta-invite', '9876543210')`)
    await t.asUser(USER_ADMIN)
    const one = await call(`public.admin_email_campaign($1, 'applied')`, [id])
    expect(one.stats).toMatchObject({ signed_up: 1, applied: 1 })
    expect(one.rows).toMatchObject([{ email: "new@example.com", signed_up: true, applied: true }])
    // The next pass closes the finished campaign.
    await t.asUser(USER_A)
    await call(`public.app_email_claim($1, 5)`, [SERVER_KEY])
    await t.asUser(USER_ADMIN)
    expect((await call(`public.admin_email_campaign($1)`, [id])).campaign.status).toBe("done")
  })

  it("sends only during the sending hours, spread through the day", async () => {
    await t.asOwner()
    await t.query(`update private.admin_settings set email_send_from = 10, email_send_to = 19`)
    const at = async (ist: string) => (await t.one<{ n: number }>(`select private.email_allowed_now($1::timestamp at time zone 'Asia/Kolkata') as n`, [ist]))!.n
    expect(await at("2026-11-16 00:05")).toBe(0)
    expect(await at("2026-11-16 09:59")).toBe(0)
    expect(await at("2026-11-16 10:00")).toBe(10)
    expect(await at("2026-11-16 14:30")).toBe(60) // halfway: 50 of 100, plus the first batch of 10
    expect(await at("2026-11-16 18:59")).toBe(100)
    expect(await at("2026-11-16 19:00")).toBe(0)
    await t.query(`update private.admin_settings set email_send_from = null`)
    expect(await at("2026-11-16 03:00")).toBe(100)
  })
})
