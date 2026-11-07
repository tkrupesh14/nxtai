// 5.7 XP ledger (migration 026): written only by triggers, once per reward, kept when a course is deleted.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

const xp = async () => (await t.one<{ x: { total: number; week: number } }>(`select public.my_xp() as x`))!.x
const keys = async () => (await t.query<{ key: string }>(`select key from public.xp_events order by id`)).map((r) => r.key.split(":")[0])

describe("xp", () => {
  it("pays for a passed lesson once, a perfect score once, and one study-day bonus", async () => {
    const { lessonIds } = await t.createCourse(2)
    await t.writeLesson(lessonIds[0])
    await t.query(`select public.submit_quiz($1, '{1}')`, [lessonIds[0]]) // failed: nothing
    expect(await xp()).toEqual({ total: 0, week: 0 })

    await t.query(`select public.submit_quiz($1, '{0}')`, [lessonIds[0]]) // passed with 100%
    expect(await keys()).toEqual(["lesson", "day", "perfect"])
    expect(await xp()).toEqual({ total: 20, week: 20 })

    await t.query(`select public.submit_quiz($1, '{0}')`, [lessonIds[0]]) // retake: nothing more
    await t.writeLesson(lessonIds[1])
    await t.query(`select public.submit_quiz($1, '{0}')`, [lessonIds[1]]) // same day: no second day bonus
    expect((await xp()).total).toBe(35)

    await t.asUser(USER_B)
    expect(await xp()).toEqual({ total: 0, week: 0 })
    expect(await t.query(`select key from public.xp_events`)).toEqual([])
  })

  it("can't be written by learners, and survives deleting the course", async () => {
    const { courseId, lessonIds } = await t.createCourse(1)
    await t.writeLesson(lessonIds[0])
    await t.query(`select public.submit_quiz($1, '{0}')`, [lessonIds[0]])
    expect(await errorOf(t.query(`insert into public.xp_events (user_id, key, points) values ($1, 'x', 100)`, [USER_A]))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`update public.xp_events set points = 100`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select private.award_xp($1, 'x', 100)`, [USER_A]))).toMatch(/permission denied/)

    await t.asOwner()
    await t.query(`delete from public.courses where id = $1`, [courseId])
    await t.asUser(USER_A)
    expect((await xp()).total).toBe(20)
  })

  it("gives a study-day bonus for a professor answer, and only counts the last 7 days as this week", async () => {
    const { lessonIds } = await t.createCourse(1)
    await t.query(`select * from public.take_question_credit($1, -1, 'ask', 'why?')`, [lessonIds[0]])
    await t.query(`update public.professor_questions set status = 'answered'`)
    expect(await keys()).toEqual(["day"])

    await t.asOwner()
    await t.query(`update public.xp_events set created_at = now() - interval '10 days'`)
    await t.asUser(USER_A)
    expect(await xp()).toEqual({ total: 5, week: 0 })
  })
})
