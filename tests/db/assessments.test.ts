// Module tests, the final exam and certificates (migration 014), run through the real SQL functions.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

type Claim = { status: string; assessment_id: string | null; claimed_at: string | null }
type Questions = { retryAt: string | null; attempts: number; passed: boolean; questions: { i: number; question: string; options: { i: number; text: string }[] }[] }
type Result = {
  error?: string
  retryAt?: string | null
  score: number
  passed: boolean
  finalUnlocked: boolean
  results: { i: number; correct: boolean; answerIndex?: number; explanation?: string }[]
}

/** 10 questions; the right answer of question k is option k % 4. */
const QUESTIONS = Array.from({ length: 10 }, (_, k) => ({
  question: `Question ${k}?`,
  options: ["a", "b", "c", "d"],
  answer_index: k % 4,
  explanation: `because ${k}`,
}))
const right = QUESTIONS.map((q) => q.answer_index)
/** Answers with the first `wrong` questions answered wrongly. */
const answers = (wrong = 0) => right.map((a, k) => (k < wrong ? (a + 1) % 4 : a))

/** A course with two modules of one lesson each, every lesson written and passed. */
async function passedCourse() {
  const plan = [
    { title: "M1", summary: "s", lessons: [{ title: "L1", objective: "o", est_minutes: 20 }] },
    { title: "M2", summary: "s", lessons: [{ title: "L2", objective: "o", est_minutes: 30 }] },
  ]
  const { id: courseId } = (await t.one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
    SERVER_KEY,
    JSON.stringify({ title: "Python basics", summary: "s", level: "beginner", goal: "g", category: "coding", subcategory: "python" }),
    JSON.stringify(plan),
  ]))!
  const lessons = await t.query<{ id: string; module_id: string }>(`select id, module_id from public.lessons where course_id = $1 order by position`, [courseId])
  for (const l of lessons) {
    await t.writeLesson(l.id)
    await t.query(`select public.submit_quiz($1, '{0}')`, [l.id])
  }
  return { courseId, modules: lessons.map((l) => l.module_id) }
}

const claim = (courseId: string, moduleId: string | null) =>
  t.one<Claim>(`select * from public.app_claim_assessment($1, $2, $3)`, [SERVER_KEY, courseId, moduleId])

async function writeAssessment(courseId: string, moduleId: string | null) {
  const c = await claim(courseId, moduleId)
  if (c?.status !== "claimed") throw new Error(`claim returned ${c?.status}`)
  const ok = await t.one<{ ok: boolean }>(`select public.app_save_assessment($1, $2, $3, $4) as ok`, [SERVER_KEY, c.assessment_id, c.claimed_at, JSON.stringify(QUESTIONS)])
  if (!ok?.ok) throw new Error("save failed")
  return c.assessment_id!
}

const submit = async (id: string, a: number[]) => (await t.one<{ r: Result }>(`select public.submit_assessment($1, $2) as r`, [id, `{${a.join(",")}}`]))!.r
const questionsOf = async (id: string) => (await t.one<{ q: Questions }>(`select public.assessment_questions($1) as q`, [id]))!.q

/** Move every try of an assessment back in time (as the owner). */
async function age(id: string, interval: string) {
  await t.asOwner()
  await t.query(`update public.assessment_attempts set created_at = created_at - $2::interval where assessment_id = $1`, [id, interval])
  await t.asUser(USER_A)
}

async function makePro(user = USER_A) {
  await t.asOwner()
  await t.query(`insert into public.user_plans (user_id, plan, status, current_period_end) values ($1, 'pro', 'active', now() + interval '30 days')`, [user])
  await t.asUser(user)
}

/** Pass both module tests and the final exam; returns the course id. */
async function passEverything() {
  const { courseId, modules } = await passedCourse()
  for (const m of modules) await submit(await writeAssessment(courseId, m), answers())
  const exam = await writeAssessment(courseId, null)
  expect((await submit(exam, answers())).passed).toBe(true)
  return courseId
}

describe("module tests", () => {
  it("unlock only when every lesson in the module is passed", async () => {
    const { courseId } = await t.createCourse(2)
    const moduleId = (await t.one<{ id: string }>(`select id from public.course_modules where course_id = $1`, [courseId]))!.id
    expect((await claim(courseId, moduleId))?.status).toBe("locked")
  })

  it("are written once, by one request", async () => {
    const { courseId, modules } = await passedCourse()
    const first = await claim(courseId, modules[0])
    expect(first?.status).toBe("claimed")
    expect((await claim(courseId, modules[0]))?.status).toBe("pending")
    await t.query(`select public.app_save_assessment($1, $2, $3, $4)`, [SERVER_KEY, first!.assessment_id, first!.claimed_at, JSON.stringify(QUESTIONS)])
    expect(await claim(courseId, modules[0])).toMatchObject({ status: "ready", assessment_id: first!.assessment_id })
    // The questions can't be replaced afterwards.
    const swapped = QUESTIONS.map((q) => ({ ...q, answer_index: 0 }))
    const again = await t.one<{ ok: boolean }>(`select public.app_save_assessment($1, $2, $3, $4) as ok`, [SERVER_KEY, first!.assessment_id, first!.claimed_at, JSON.stringify(swapped)])
    expect(again?.ok).toBe(false)
  })

  it("need the server key and valid questions", async () => {
    const { courseId, modules } = await passedCourse()
    expect(await errorOf(t.query(`select * from public.app_claim_assessment('wrong', $1, $2)`, [courseId, modules[0]]))).toMatch(/server key/)
    const c = await claim(courseId, modules[0])
    const bad = [{ ...QUESTIONS[0], answer_index: 7 }, ...QUESTIONS.slice(1)]
    expect(await errorOf(t.query(`select public.app_save_assessment($1, $2, $3, $4)`, [SERVER_KEY, c!.assessment_id, c!.claimed_at, JSON.stringify(bad)]))).toMatch(
      /invalid questions/,
    )
  })

  it("hide the answers, shuffle each try, and grade in the database", async () => {
    const { courseId, modules } = await passedCourse()
    const id = await writeAssessment(courseId, modules[0])

    // Learners can't read the questions table column.
    expect(await errorOf(t.query(`select questions from public.assessments`))).toMatch(/permission denied/)
    const q = await questionsOf(id)
    expect(JSON.stringify(q)).not.toMatch(/answer_index|because/)
    expect(q.questions.map((x) => x.i).sort((a, b) => a - b)).toEqual(QUESTIONS.map((_, k) => k))
    expect(q.questions[0].options.map((o) => o.text).sort()).toEqual(["a", "b", "c", "d"])

    // 6/10 = 60%: fail. Only right/wrong is shown, not the answers.
    const fail = await submit(id, answers(4))
    expect(fail).toMatchObject({ score: 60, passed: false })
    expect(fail.results[0]).toEqual({ i: 0, correct: false })
    expect(fail.retryAt).toBeTruthy()
    // The next try shows a different order.
    expect((await questionsOf(id)).questions.map((x) => x.i)).not.toEqual(q.questions.map((x) => x.i))
  })

  it("can be retaken an hour after a fail; passing shows the answers", async () => {
    const { courseId, modules } = await passedCourse()
    const id = await writeAssessment(courseId, modules[0])
    await submit(id, answers(10))
    expect(await submit(id, answers())).toMatchObject({ error: "wait" })
    await age(id, "61 minutes")
    // 7/10 = 70%: pass.
    const pass = await submit(id, answers(3))
    expect(pass).toMatchObject({ score: 70, passed: true, retryAt: null, finalUnlocked: false })
    expect(pass.results[0]).toEqual({ i: 0, correct: false, answerIndex: 0, explanation: "because 0" })
    expect(await t.one(`select attempts, best_score, passed_at is not null as passed from public.assessments where id = $1`, [id])).toEqual({
      attempts: 2,
      best_score: 70,
      passed: true,
    })
  })

  it("belong to their learner only", async () => {
    const { courseId, modules } = await passedCourse()
    const id = await writeAssessment(courseId, modules[0])
    await t.asUser(USER_B)
    expect((await claim(courseId, modules[0]))?.status).toBe("not_found")
    expect(await questionsOf(id)).toBeNull()
    expect((await submit(id, answers())).error).toMatch(/isn't available/)
    expect(await t.query(`select id from public.assessments`)).toEqual([])
  })
})

describe("final exam", () => {
  it("unlocks when every module test is passed", async () => {
    const { courseId, modules } = await passedCourse()
    expect((await claim(courseId, null))?.status).toBe("locked")
    expect((await submit(await writeAssessment(courseId, modules[0]), answers())).finalUnlocked).toBe(false)
    expect((await submit(await writeAssessment(courseId, modules[1]), answers())).finalUnlocked).toBe(true)
    expect((await claim(courseId, null))?.status).toBe("claimed")
  })

  it("allows two tries a day until passed", async () => {
    const { courseId, modules } = await passedCourse()
    for (const m of modules) await submit(await writeAssessment(courseId, m), answers())
    const exam = await writeAssessment(courseId, null)
    expect((await submit(exam, answers(10))).retryAt).toBeNull()
    expect((await submit(exam, answers(10))).retryAt).toBeTruthy()
    expect(await submit(exam, answers())).toMatchObject({ error: "wait" })
    await age(exam, "1 day")
    expect(await submit(exam, answers())).toMatchObject({ passed: true, score: 100 })
  })
})

describe("certificates", () => {
  const issue = async (courseId: string, name = "Asha Rao") =>
    (await t.one<{ r: { code?: string; error?: string } }>(`select public.issue_certificate($1, $2) as r`, [courseId, name]))!.r

  it("need the final exam passed", async () => {
    const { courseId } = await passedCourse()
    await makePro()
    expect(await issue(courseId)).toEqual({ error: "not_passed" })
  })

  it("are for Pro learners only", async () => {
    const courseId = await passEverything()
    expect(await issue(courseId)).toEqual({ error: "pro_only" })
    await makePro()
    expect((await issue(courseId)).code).toMatch(/^[0-9A-F]{12}$/)
  })

  it("are issued once, check the name, and can be verified by anyone", async () => {
    const courseId = await passEverything()
    await makePro()
    expect(await issue(courseId, " x ")).toEqual({ error: "bad_name" })
    expect(await issue(courseId, "<script>")).toEqual({ error: "bad_name" })
    const { code } = await issue(courseId, "  Asha   Rao ")
    expect(await issue(courseId, "Someone Else")).toEqual({ code })

    await t.asAnon()
    expect(await t.one(`select * from public.get_certificate($1)`, [code!.toLowerCase()])).toMatchObject({
      code,
      full_name: "Asha Rao",
      course_title: "Python basics",
      course_level: "beginner",
      lesson_count: 2,
      total_minutes: 50,
      score: 100,
    })
    expect(await t.query(`select * from public.get_certificate('NOPE')`)).toEqual([])
    expect(await errorOf(t.query(`select * from public.certificates`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`select public.issue_certificate($1, 'x')`, [courseId]))).toMatch(/permission denied/)
  })

  it("stay valid after the course is deleted", async () => {
    const courseId = await passEverything()
    await makePro()
    const { code } = await issue(courseId)
    await t.query(`delete from public.courses where id = $1`, [courseId])
    await t.asAnon()
    expect((await t.one(`select * from public.get_certificate($1)`, [code]))?.course_title).toBe("Python basics")
  })
})
