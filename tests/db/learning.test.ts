// The learning loop and plan limits, run through the real SQL functions.
import { beforeEach, describe, expect, it } from "vitest"

import { PLANS } from "@/lib/learning/plans"

import { createTestDb, errorOf, SERVER_KEY, USER_A, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.asUser(USER_A)
})

const grantCredits = async (n: number) => {
  await t.asOwner()
  await t.query(`insert into public.credit_ledger (user_id, delta, reason) values ($1, $2, 'grant')`, [USER_A, n])
  await t.asUser(USER_A)
}
const makePro = async () => {
  await t.asOwner()
  await t.query(`insert into public.user_plans (user_id, plan, status, current_period_end) values ($1, 'pro', 'active', now() + interval '30 days')`, [USER_A])
  await t.asUser(USER_A)
}

describe("lessons", () => {
  it("unlock in order and are graded by the database", async () => {
    const { lessonIds } = await t.createCourse(2)
    expect((await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[1]]))?.status).toBe("locked")

    await t.writeLesson(lessonIds[0])
    // The page gets questions without answers.
    const q = await t.one<{ q: object[] }>(`select public.lesson_quiz_questions($1) as q`, [lessonIds[0]])
    expect(q?.q).toEqual([{ question: "Q?", options: ["right", "wrong", "no", "nope"] }])

    const fail = await t.one<{ r: { score: number; passed: boolean } }>(`select public.submit_quiz($1, '{1}') as r`, [lessonIds[0]])
    expect(fail?.r).toMatchObject({ score: 0, passed: false })
    expect((await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[1]]))?.status).toBe("locked")

    const pass = await t.one<{ r: { score: number; passed: boolean; nextLessonId: string } }>(`select public.submit_quiz($1, '{0}') as r`, [lessonIds[0]])
    expect(pass?.r).toMatchObject({ score: 100, passed: true, nextLessonId: lessonIds[1] })
    expect((await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[1]]))?.status).toBe("claimed")
  })

  it("can be claimed by only one request at a time", async () => {
    const { lessonIds } = await t.createCourse(1)
    expect((await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[0]]))?.status).toBe("claimed")
    expect((await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[0]]))?.status).toBe("pending")
  })

  it("regenerate costs 5 credits, keeps progress, and is capped at 5 a day", async () => {
    const { lessonIds } = await t.createCourse(2)
    await t.writeLesson(lessonIds[0])
    await t.query(`select public.submit_quiz($1, '{0}')`, [lessonIds[0]])
    const reset = () => t.one<{ result: string; credits_left: number }>(`select * from public.app_reset_lesson($1, $2)`, [SERVER_KEY, lessonIds[0]])

    expect((await reset())?.result).toBe("no_credits")
    await grantCredits(100)
    expect(await reset()).toMatchObject({ result: "ok", credits_left: 95 })
    await t.asOwner()
    expect(await t.one(`select blocks is null as cleared, completed_at is not null as still_done from public.lessons where id = $1`, [lessonIds[0]])).toEqual({
      cleared: true,
      still_done: true,
    })
    await t.asUser(USER_A)
    for (let i = 0; i < 4; i++) {
      await t.writeLesson(lessonIds[0])
      expect((await reset())?.result).toBe("ok")
    }
    await t.writeLesson(lessonIds[0])
    expect((await reset())?.result).toBe("daily_limit")
    await t.asOwner()
    expect((await t.one<{ c: number }>(`select public.credit_balance($1) as c`, [USER_A]))?.c).toBe(75)
  })
})

describe("plan limits match what the site advertises", () => {
  it.each([
    ["free", PLANS.free],
    ["pro", PLANS.pro],
  ] as const)("%s", async (plan, limits) => {
    if (plan === "pro") await makePro()
    const s = await t.one(`select plan, ask_day, ask_lesson, quick_day, courses_month from public.my_account_summary()`)
    expect(s).toEqual({ plan, ask_day: limits.askDay, ask_lesson: limits.askLesson, quick_day: limits.quickDay, courses_month: limits.coursesMonth })
  })
})

describe("professor questions", () => {
  // Questions must be 10 s apart; move earlier ones back in time instead of waiting.
  const ask = async (lesson: string) => {
    await t.asOwner()
    await t.query(`update public.professor_questions set created_at = created_at - interval '1 minute', status = 'answered'`)
    await t.asUser(USER_A)
    return t.one<{ question_id: string | null; reason: string | null; paid: boolean }>(`select * from public.take_question_credit($1, -1, 'ask', 'why?')`, [lesson])
  }

  it("free: 3 per lesson, 5 a day, then 1 credit each", async () => {
    const { lessonIds } = await t.createCourse(3)
    for (let i = 0; i < 3; i++) expect((await ask(lessonIds[0]))?.question_id).toBeTruthy()
    expect((await ask(lessonIds[0]))?.reason).toBe("lesson_limit")
    for (let i = 0; i < 2; i++) expect((await ask(lessonIds[1]))?.question_id).toBeTruthy()
    expect((await ask(lessonIds[2]))?.reason).toBe("daily_limit")

    await grantCredits(1)
    expect(await ask(lessonIds[2])).toMatchObject({ reason: null, paid: true })
    expect((await ask(lessonIds[2]))?.reason).toBe("daily_limit")
  })

  it("rejects rapid-fire questions", async () => {
    const { lessonIds } = await t.createCourse(1)
    await t.query(`select * from public.take_question_credit($1, -1, 'ask', 'one')`, [lessonIds[0]])
    expect((await t.one<{ reason: string }>(`select * from public.take_question_credit($1, -1, 'ask', 'two')`, [lessonIds[0]]))?.reason).toBe("slow_down")
  })
})

describe("course creation", () => {
  it("free: 2 a month, then 20 credits each, max 3 a day", async () => {
    await t.createCourse(1)
    await t.createCourse(1)
    expect(await errorOf(t.createCourse(1))).toMatch(/course_monthly_limit/)
    await grantCredits(50)
    await t.createCourse(1)
    await t.asOwner()
    expect((await t.one<{ c: number }>(`select public.credit_balance($1) as c`, [USER_A]))?.c).toBe(30)
    await t.asUser(USER_A)
    expect(await errorOf(t.createCourse(1))).toMatch(/course_daily_limit/)
  })
})
