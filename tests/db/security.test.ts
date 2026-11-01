// Row-level security and server-only functions: what a learner (or a stranger) can and can't do.
import { beforeAll, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

const SNAPSHOT = `select
  (select count(*) from public.courses)::int as courses,
  (select count(*) from public.lessons)::int as lessons,
  (select count(completed_at) from public.lessons)::int as done,
  (select md5(coalesce(string_agg(blocks::text, ''), '')) from public.lessons) as blocks,
  (select coalesce(sum(delta), 0) from public.credit_ledger)::int as credits,
  (select count(*) from public.user_plans)::int as plans,
  (select count(*) from public.payment_orders where status = 'paid')::int as paid`

let t: TestDb
let courseId: string
let lessonIds: string[]

beforeAll(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.asUser(USER_A)
  ;({ courseId, lessonIds } = await t.createCourse(2))
  await t.writeLesson(lessonIds[0])
})

describe("a learner cannot write learning data directly", () => {
  it.each([
    ["insert a course", `insert into public.courses (title, summary, level, goal) values ('x','x','beginner','x')`],
    ["edit a lesson", `update public.lessons set blocks = '[]' where true`],
    ["mark a lesson complete", `update public.lessons set completed_at = now(), best_score = 100 where true`],
    ["add a lesson", `insert into public.lessons (course_id, module_id, position, title, objective) select course_id, module_id, 99, 'x', 'x' from public.lessons limit 1`],
    ["read quiz answers", `select quiz from public.lessons`],
    ["give themselves credits", `insert into public.credit_ledger (user_id, delta, reason) values ('${USER_A}', 1000, 'grant')`],
    ["give themselves Pro", `insert into public.user_plans (user_id, plan, status) values ('${USER_A}', 'pro', 'active')`],
    ["mark an order paid", `update public.payment_orders set status = 'paid' where true`],
    ["read the server key hash", `select * from private.server_keys`],
    ["call current_plan", `select public.current_plan('${USER_A}')`],
    ["call credit_balance", `select public.credit_balance('${USER_A}')`],
  ])("can't %s", async (_, sql) => {
    await t.asOwner()
    const before = await t.one(SNAPSHOT)
    await t.asUser(USER_A)
    const err = await errorOf(t.query(sql))
    await t.asOwner()
    // Either refused outright, or row-level security made it change nothing.
    expect(await t.one(SNAPSHOT)).toEqual(before)
    if (err === null) {
      expect(sql).toMatch(/^update /) // only updates may silently match no rows
    } else {
      expect(err).toMatch(/permission denied|row-level security|violates/)
    }
  })
})

describe("server-only functions need the server key", () => {
  it.each([
    ["create a course", `select public.app_create_course('wrong', '{}', '[]')`],
    ["claim a lesson", `select public.app_claim_lesson('wrong', $1)`],
    ["regenerate a lesson", `select public.app_reset_lesson('wrong', $1)`],
    ["log AI usage", `select public.app_log_ai_usage('wrong', 'lesson', 1, 1)`],
  ])("can't %s with a wrong key", async (_, sql) => {
    await t.asUser(USER_A)
    const params = sql.includes("$1") ? [lessonIds[0]] : []
    expect(await errorOf(t.query(sql, params))).toMatch(/server key|permission/i)
  })
})

describe("learners only see their own things", () => {
  it("B sees none of A's courses, lessons or chats", async () => {
    await t.asUser(USER_B)
    expect(await t.query(`select id from public.courses`)).toEqual([])
    expect(await t.query(`select id from public.lessons`)).toEqual([])
    expect(await t.query(`select id from public.professor_questions`)).toEqual([])
  })
  it("B can't claim, regenerate, archive or report A's lesson", async () => {
    await t.asUser(USER_B)
    const claim = await t.one<{ status: string }>(`select * from public.app_claim_lesson($1, $2)`, [SERVER_KEY, lessonIds[1]])
    expect(claim?.status).toBeTruthy()
    expect(claim?.status).not.toBe("claimed")
    const reset = await t.one<{ result: string }>(`select * from public.app_reset_lesson($1, $2)`, [SERVER_KEY, lessonIds[0]])
    expect(reset?.result).toBe("not_found")
    expect((await t.one<{ ok: boolean }>(`select public.set_course_archived($1, true) as ok`, [courseId]))?.ok).toBeFalsy()
    const quiz = await t.one<{ q: unknown[] }>(`select public.lesson_quiz_questions($1) as q`, [lessonIds[0]])
    expect(quiz?.q).toEqual([])
  })
  it("signed-out visitors read nothing", async () => {
    await t.asAnon()
    for (const table of ["courses", "lessons", "credit_ledger", "payment_orders", "user_plans", "professor_questions"]) {
      const err = await errorOf(t.query(`select * from public.${table}`))
      if (err === null) expect(await t.query(`select * from public.${table}`)).toEqual([])
      else expect(err).toMatch(/permission denied/)
    }
  })
})

describe("admin functions", () => {
  it("refuse normal learners", async () => {
    await t.asUser(USER_A)
    for (const fn of ["admin_overview()", "admin_users('', 10)", "admin_payments(10)", "admin_errors(24)"]) {
      expect(await errorOf(t.query(`select * from public.${fn}`))).toMatch(/not allowed|permission|admin/i)
    }
    expect(await errorOf(t.query(`select public.admin_grant('a@example.com', 1000, 30, 'x')`))).toMatch(/not allowed|permission|admin/i)
  })
  it("work for a listed admin", async () => {
    await t.asOwner()
    await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
    await t.asUser(USER_ADMIN)
    expect((await t.one<{ is_admin: boolean }>(`select public.is_admin() as is_admin`))?.is_admin).toBe(true)
    expect(await errorOf(t.query(`select * from public.admin_overview()`))).toBeNull()
  })
})
