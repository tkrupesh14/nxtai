// 9.4 push subscriptions and the push queue; 9.5 study reminders.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb

const FCM = "https://fcm.googleapis.com/fcm/send/abc123"
const P256DH = "B" + "x".repeat(86)
const AUTH = "y".repeat(22)

const reminders = async () => {
  await t.asAnon()
  return (await t.one<{ n: number }>(`select public.app_create_reminders($1) as n`, [SERVER_KEY]))!.n
}
const mine = async () => {
  await t.asUser(USER_B)
  return t.query<{ kind: string; title: string; body: string; link: string }>(
    `select kind, title, body, link from public.notifications where kind like 'reminder%' order by created_at`,
  )
}

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_B, "learner@example.com")
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.asOwner()
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
})

describe("push", () => {
  it("saves a device only for a real push service, and keeps it private", async () => {
    await t.asUser(USER_B)
    await t.query(`select public.save_push_subscription($1, $2, $3)`, [FCM, P256DH, AUTH])
    await t.query(`select public.save_push_subscription($1, $2, $3)`, [FCM, P256DH, AUTH]) // again: still one
    expect(await t.query(`select endpoint from public.push_subscriptions`)).toEqual([{ endpoint: FCM }])
    for (const bad of ["http://fcm.googleapis.com/x", "https://169.254.169.254/latest", "https://fcm.googleapis.com.evil.io/x"]) {
      expect(await errorOf(t.query(`select public.save_push_subscription($1, $2, $3)`, [bad, P256DH, AUTH]))).toMatch(/check constraint/)
    }
    expect(await errorOf(t.query(`select p256dh from public.push_subscriptions`))).toMatch(/permission denied/)

    await t.asUser(USER_ADMIN)
    expect(await t.query(`select endpoint from public.push_subscriptions`)).toEqual([])
    expect(await errorOf(t.query(`select public.app_take_pushes('wrong')`))).toMatch(/server key/)
  })

  it("sends each new notification once to the owner's devices, and drops devices that are gone", async () => {
    await t.asUser(USER_B)
    await t.query(`select public.save_push_subscription($1, $2, $3)`, [FCM, P256DH, AUTH])
    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_grant('learner@example.com', 50, null, null)`)

    await t.asAnon()
    const take = async () => (await t.one<{ p: unknown[] }>(`select public.app_take_pushes($1) as p`, [SERVER_KEY]))!.p
    expect(await take()).toEqual([
      expect.objectContaining({
        title: "Krpex added 50 credits to your account",
        link: "/account",
        devices: [{ endpoint: FCM, p256dh: P256DH, auth: AUTH }],
      }),
    ])
    expect(await take()).toEqual([])

    await t.query(`select public.app_push_result($1, $2, false, true)`, [SERVER_KEY, FCM])
    await t.asUser(USER_B)
    expect(await t.query(`select endpoint from public.push_subscriptions`)).toEqual([])
  })
})

describe("reminders", () => {
  it("reminds about a streak once a day, and not after studying today or with reminders off", async () => {
    await t.asUser(USER_B)
    const { lessonIds } = await t.createCourse(4)
    await t.asOwner()
    await t.query(`update public.lessons set completed_at = now() - interval '1 day' where id = $1`, [lessonIds[0]])
    await t.query(`update public.lessons set completed_at = now() - interval '2 days' where id = $1`, [lessonIds[1]])

    expect(await reminders()).toBe(1)
    expect(await reminders()).toBe(0)
    expect(await mine()).toEqual([
      {
        kind: "reminder_streak",
        title: "Keep your 2-day streak going",
        body: "Finish a lesson or ask your professor a question today to keep it.",
        link: "/learn",
      },
    ])

    await t.asOwner()
    await t.query(`delete from public.notifications`)
    await t.query(`update public.lessons set completed_at = now() where id = $1`, [lessonIds[2]])
    expect(await reminders()).toBe(0)

    await t.asOwner()
    await t.query(`update public.lessons set completed_at = null where id = $1`, [lessonIds[2]])
    await t.asUser(USER_B)
    await t.query(`select public.set_notification_settings('hourly', null, null, null, null, false)`)
    expect(await reminders()).toBe(0)
  })

  it("reminds to continue a course after 3 quiet days, at most once a week", async () => {
    await t.asUser(USER_B)
    const { courseId, lessonIds } = await t.createCourse(3)
    expect(await reminders()).toBe(0) // just started

    await t.asOwner()
    await t.query(`update public.courses set created_at = now() - interval '5 days'`)
    await t.query(`update public.lessons set completed_at = now() - interval '4 days' where id = $1`, [lessonIds[0]])
    expect(await reminders()).toBe(1)
    expect(await mine()).toEqual([
      { kind: "reminder_continue", title: "Continue Test course", body: "Next: Lesson 2", link: `/learn/${courseId}/${lessonIds[1]}` },
    ])
    expect(await reminders()).toBe(0)

    await t.asOwner()
    await t.query(`update public.notifications set created_at = now() - interval '8 days'`)
    expect(await reminders()).toBe(1)

    await t.asOwner()
    await t.query(`delete from public.notifications`)
    await t.query(`update public.courses set created_at = now() - interval '60 days'`)
    await t.query(`update public.lessons set completed_at = now() - interval '40 days' where id = $1`, [lessonIds[0]])
    expect(await reminders()).toBe(0) // gone quiet for over 30 days: stop
  })

  it("emails reminders only when the reminders topic is on", async () => {
    await t.asUser(USER_B)
    await t.createCourse(2)
    await t.asOwner()
    await t.query(`update public.courses set created_at = now() - interval '5 days'`)
    expect(await reminders()).toBe(1)
    await t.asOwner()
    await t.query(`update public.notifications set created_at = now() - interval '20 minutes'`)
    await t.asAnon()
    const due = async () => (await t.one<{ d: unknown[] }>(`select public.app_due_notification_emails($1) as d`, [SERVER_KEY]))!.d
    expect(await due()).toHaveLength(1)
    await t.asUser(USER_B)
    await t.query(`select public.set_notification_settings('hourly', null, null, null, null, false)`)
    await t.asAnon()
    expect(await due()).toEqual([])
  })
})
