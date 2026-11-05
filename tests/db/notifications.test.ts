// 9.1 + 9.2: notifications written by database triggers, read only by their owner.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
let profId: string

const asProfessor = () => t.asUser(USER_A)
const asLearner = () => t.asUser(USER_B)
const asAdmin = () => t.asUser(USER_ADMIN)
type Row = { kind: string; title: string; body: string | null; link: string | null; read_at: string | null }
const mine = () => t.query<Row>(`select kind, title, body, link, read_at from public.notifications order by created_at, kind`)
const kinds = async () => (await mine()).map((n) => n.kind)

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A, "prof@example.com")
  await t.addUser(USER_B, "learner@example.com")
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.asOwner()
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
  await asAdmin()
  const tok = (await t.one<{ tok: string }>(`select public.admin_create_professor_invite('prof@example.com', 'science/physics') as tok`))!.tok
  await asProfessor()
  await t.query(`select public.accept_professor_invite($1, 'Dr. Asha Rao', 'draft-2026-11-05')`, [tok])
  await t.asOwner()
  profId = (await t.one<{ id: string }>(`select id from public.professors`))!.id
})

describe("professor account", () => {
  it("tells admins about a new professor and a request to go live, and the professor about approval and going live", async () => {
    await asAdmin()
    expect(await kinds()).toEqual(["admin_professor_joined"])

    await asProfessor()
    await t.query(`select public.professor_update_profile('Dr. Asha Rao', null, null, null, '{en}', null, null, true)`)
    await asAdmin()
    expect(await kinds()).toEqual(["admin_professor_joined", "admin_listing_requested"])
    await t.query(`select public.admin_set_professor_status($1, 'approved')`, [profId])
    await t.query(`select public.admin_set_professor_live($1, true)`, [profId])

    await asProfessor()
    expect(await mine()).toMatchObject([
      { kind: "professor_approved", link: "/teach" },
      { kind: "professor_live", title: "Your AI professor is live" },
    ])
    await asLearner()
    expect(await mine()).toEqual([])
  })
})

describe("inbox", () => {
  let questionId: string
  let path: string

  beforeEach(async () => {
    await asProfessor()
    await t.query(`select public.professor_update_profile('Dr. Asha Rao', null, null, null, '{en}', null, null, true)`)
    await asAdmin()
    await t.query(`select public.admin_set_professor_status($1, 'approved')`, [profId])
    await t.query(`select public.admin_set_professor_live($1, true)`, [profId])
    await asLearner()
    const { id: courseId } = (await t.one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
      SERVER_KEY,
      JSON.stringify({ title: "Mechanics", summary: "s", level: "beginner", goal: "g", category: "science", subcategory: "physics", professor: `p:${profId}` }),
      JSON.stringify([{ title: "Module 1", summary: "s", lessons: [{ title: "Inertia", objective: "o", est_minutes: 20 }] }]),
    ]))!
    await t.asOwner()
    const lessonId = (await t.one<{ id: string }>(`select id from public.lessons where course_id = $1`, [courseId]))!.id
    path = `/learn/${courseId}/${lessonId}?ask=1`
    questionId = (await t.one<{ id: string }>(
      `insert into public.professor_questions (user_id, lesson_id, question, reply, verdict, status)
       values ($1, $2, 'Why does the puck keep moving?', 'The AI says so.', 'answer', 'answered') returning id`,
      [USER_B, lessonId],
    ))!.id
    await t.query(`delete from public.notifications`)
  })

  it("tells the professor about a new question without naming the learner, and the learner about the reply", async () => {
    await asLearner()
    const { id: flagId } = (await t.one<{ id: string }>(`select public.flag_for_professor($1, 'My teacher said otherwise') as id`, [questionId]))!

    await asProfessor()
    const [n] = await mine()
    expect(n).toMatchObject({ kind: "inbox_question", link: "/teach#inbox", read_at: null })
    expect(n.body).toContain("Why does the puck keep moving?")
    expect(JSON.stringify(await t.query(`select * from public.notifications`))).not.toMatch(new RegExp(`${USER_B}|learner@example`))

    await t.query(`select public.professor_reply_flag($1, 'answered', 'Friction is tiny on ice.')`, [flagId])
    await t.query(`select public.professor_reply_flag($1, 'answered', 'Friction is tiny on ice, so it keeps going.')`, [flagId])
    await asLearner()
    // The edited reply replaces the unread notification instead of adding a second one.
    expect(await mine()).toEqual([
      { kind: "professor_reply", title: "Dr. Asha Rao replied to your question", body: "Friction is tiny on ice, so it keeps going.", link: path, read_at: null },
    ])

    await asProfessor()
    await t.query(`select public.professor_reply_flag($1, 'confirmed', null)`, [flagId])
    await asLearner()
    expect(await kinds()).toEqual(["professor_reply", "professor_confirmed"])
  })

  it("is read and marked read only by its owner, and can't be written directly", async () => {
    await asLearner()
    await t.query(`select public.flag_for_professor($1, null)`, [questionId])
    expect(await mine()).toEqual([])
    expect(await t.one<{ n: number }>(`select public.mark_notifications_read(null) as n`)).toEqual({ n: 0 })

    await asProfessor()
    const id = (await t.one<{ id: string }>(`select id from public.notifications`))!.id
    expect(await errorOf(t.query(`update public.notifications set read_at = now()`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`insert into public.notifications (user_id, kind, title) values ($1, 'admin_report', 'x')`, [USER_A]))).toMatch(
      /permission denied/,
    )
    expect(await errorOf(t.query(`select private.notify($1, 'admin_report', 'x', null, null, null)`, [USER_B]))).toMatch(/permission denied/)
    expect(await t.one<{ n: number }>(`select public.mark_notifications_read($1) as n`, [[id]])).toEqual({ n: 0 })
    expect((await mine())[0].read_at).not.toBeNull()
  })
})

describe("payments, grants and reports", () => {
  it("tells the learner about a payment, a grant and a resolved report, and admins about a new report", async () => {
    await asLearner()
    await t.query(`select public.app_create_order($1, 'order_1', 'c100', 9900, 100, 0)`, [SERVER_KEY])
    await t.asAnon()
    await t.query(`select public.app_apply_payment($1, 'order_1', 'pay_1', 9900)`, [SERVER_KEY])
    await asAdmin()
    await t.query(`select public.admin_grant('learner@example.com', 50, 30, 'support ticket 12')`)

    await asLearner()
    const { id: courseId } = (await t.one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
      SERVER_KEY,
      JSON.stringify({ title: "Algebra", summary: "s", level: "beginner", goal: "g", category: "maths", subcategory: "algebra" }),
      JSON.stringify([{ title: "Module 1", summary: "s", lessons: [{ title: "Equations", objective: "o", est_minutes: 20 }] }]),
    ]))!
    const lessonId = (await t.one<{ id: string }>(`select id from public.lessons where course_id = $1`, [courseId]))!.id
    await t.query(`select public.report_lesson($1, 'wrong', 'Step 2 is wrong')`, [lessonId])

    await asAdmin()
    expect((await mine()).filter((n) => n.kind === "admin_report")).toMatchObject([{ title: "New problem report: wrong", body: "Equations", link: "/admin" }])
    await t.asOwner()
    const reportId = (await t.one<{ id: string }>(`select id from public.lesson_reports`))!.id
    await asAdmin()
    await t.query(`select public.admin_resolve_report($1)`, [reportId])

    await asLearner()
    const rows = await mine()
    expect(rows.map((n) => n.kind)).toEqual(["payment_paid", "credits_granted", "pro_granted", "report_resolved"])
    expect(rows[0]).toMatchObject({ body: "100 credits were added to your account.", link: "/account" })
    expect(rows[1].title).toBe("Krpex added 50 credits to your account")
    expect(JSON.stringify(rows)).not.toContain("support ticket") // the admin's note stays private
    expect(rows[3].link).toBe(`/learn/${courseId}/${lessonId}`)
  })
})
