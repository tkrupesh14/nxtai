// 9.3: which notifications are emailed, to whom and when; settings and the unsubscribe link.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb

type Due = { user_id: string; email: string; unsubscribe_token: string; items: { id: string; title: string; link: string | null }[] }
const due = async () => {
  await t.asAnon() // the server calls with the anon key + server key
  return (await t.one<{ d: Due[] }>(`select public.app_due_notification_emails($1) as d`, [SERVER_KEY]))!.d
}
const markSent = async (d: Due) => {
  await t.asAnon()
  await t.query(`select public.app_mark_notifications_emailed($1, $2, $3)`, [SERVER_KEY, d.user_id, d.items.map((i) => i.id)])
}
/** Make every notification older than the 10-minute wait, and every email older than the hourly gap. */
const later = async (minutes = 20) => {
  await t.asOwner()
  await t.query(`update public.notifications set created_at = created_at - make_interval(mins => $1)`, [minutes])
  await t.query(`update public.notification_email_settings set last_sent_at = last_sent_at - make_interval(mins => $1)`, [minutes])
}
const grant = async (credits: number) => {
  await t.asUser(USER_ADMIN)
  await t.query(`select public.admin_grant('learner@example.com', $1, null, null)`, [credits])
}

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_B, "learner@example.com")
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.asOwner()
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await t.query(`update public.users set full_name = 'Riya' where id = $1`, [USER_B])
})

describe("notification emails", () => {
  it("waits 10 minutes, sends each unread notification once, then at most hourly", async () => {
    await grant(50)
    expect(await due()).toEqual([])

    await later()
    const [d] = await due()
    expect(d).toMatchObject({ user_id: USER_B, email: "learner@example.com", name: "Riya" })
    expect(d.items.map((i) => i.title)).toEqual(["Krpex added 50 credits to your account"])
    await markSent(d)
    expect(await due()).toEqual([])

    await grant(20)
    await later(20)
    expect(await due()).toEqual([]) // last email was 20 minutes ago
    await later(40)
    expect((await due())[0].items.map((i) => i.title)).toEqual(["Krpex added 20 credits to your account"])
  })

  it("skips what was read in the app, topics turned off, old notifications and unconfirmed emails", async () => {
    await grant(50)
    await t.asUser(USER_B)
    await t.query(`select public.mark_notifications_read(null)`)
    await later()
    expect(await due()).toEqual([])

    await grant(30)
    await t.asUser(USER_B)
    await t.query(`select public.set_notification_email_settings('hourly', true, false, true, true)`)
    expect(await t.query(`select frequency, account from public.notification_email_settings`)).toEqual([{ frequency: "hourly", account: false }])
    await t.query(`select public.set_notification_email_settings('hourly', true, null, null, null)`) // null keeps the current value
    expect(await t.query(`select frequency, account from public.notification_email_settings`)).toEqual([{ frequency: "hourly", account: false }])
    await later()
    expect(await due()).toEqual([])

    await t.asUser(USER_B)
    await t.query(`select public.set_notification_email_settings('daily', true, true, true, true)`)
    await later(60 * 24 * 4)
    expect(await due()).toEqual([]) // 4 days old: too late to email

    await grant(10)
    await later()
    await t.asOwner()
    await t.query(`update auth.users set email_confirmed_at = null where id = $1`, [USER_B])
    expect(await due()).toEqual([])
  })

  it("turns emails off from the link without signing in, and keeps everything server-only", async () => {
    await grant(50)
    await later()
    const [d] = await due()
    await t.asAnon()
    expect(await t.one(`select public.unsubscribe_notification_emails($1) as ok`, [d.unsubscribe_token])).toEqual({ ok: true })
    expect(await t.one(`select public.unsubscribe_notification_emails(gen_random_uuid()) as ok`)).toEqual({ ok: false })
    expect(await due()).toEqual([])

    await t.asUser(USER_B)
    expect(await t.query(`select frequency from public.notification_email_settings`)).toEqual([{ frequency: "off" }])
    expect(await errorOf(t.query(`select unsubscribe_token from public.notification_email_settings`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select public.app_due_notification_emails('wrong')`))).toMatch(/server key|permission|denied/i)
    expect(await errorOf(t.query(`update public.notification_email_settings set frequency = 'hourly'`))).toMatch(/permission denied/)
    await t.asUser(USER_ADMIN)
    expect(await t.query(`select user_id from public.notification_email_settings`)).toEqual([]) // only your own row
  })
})
