// 8.4 part 2: professors' question banks and the inbox of learner questions flagged for the real professor.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

const USER_C = "33333333-3333-4333-8333-333333333333"
let t: TestDb
let profId: string

const asProfessor = () => t.asUser(USER_A)
const asLearner = () => t.asUser(USER_B)
const asAdmin = () => t.asUser(USER_ADMIN)

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A, "prof@example.com")
  await t.addUser(USER_B, "learner@example.com")
  await t.addUser(USER_C, "other@example.com")
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

const approve = async () => {
  await asAdmin()
  await t.query(`select public.admin_set_professor_status($1, 'approved')`, [profId])
}
const goLive = async () => {
  await asProfessor()
  await t.query(`select public.professor_update_profile('Dr. Asha Rao', null, null, null, '{en,hi}', null, null, true)`)
  await approve()
  await t.query(`select public.admin_set_professor_live($1, true)`, [profId])
}

const OPTIONS = ["It speeds up", "It keeps moving at the same velocity", "It stops", "It turns"]
const save = (question: string, opts: { id?: string | null; language?: string; options?: string[]; topic?: string } = {}) =>
  t.one<{ id: string }>(`select public.professor_save_question($1, $2, $3, $4, $5, 1, 'Newton''s first law.') as id`, [
    opts.id ?? null,
    opts.topic ?? "Newton's laws",
    opts.language ?? "en",
    question,
    `{${(opts.options ?? OPTIONS).map((o) => `"${o}"`).join(",")}}`,
  ]).then((r) => r!.id)
const publish = (id: string) => t.query(`select public.professor_set_question_status($1, 'published')`, [id])
const bank = async (query: string, language = "en") => {
  await asLearner()
  return (await t.one<{ q: { question: string; answer_index: number }[] }>(`select public.app_teacher_questions($1, $2, $3, $4, 5) as q`, [
    SERVER_KEY,
    profId,
    query,
    language,
  ]))!.q
}

describe("question bank", () => {
  it("is written by the professor, published once approved, and used only for a live professor", async () => {
    await asProfessor()
    const id = await save("A puck slides on frictionless ice. What happens to its velocity?")
    expect(await errorOf(save("Too few options here?", { options: ["a", "b", "c"] }))).toMatch(/check constraint|valid_options/)
    expect(await errorOf(save("Blank option here?", { options: ["a", "b", " ", "d"] }))).toMatch(/check constraint|valid_options/)
    expect(await errorOf(publish(id))).toMatch(/not_approved/)
    await approve()
    await asProfessor()
    await publish(id)
    expect(await bank("frictionless ice velocity")).toEqual([]) // approved but not live

    await goLive()
    const [q] = await bank("Inertia and velocity on ice")
    expect(q).toMatchObject({ question: "A puck slides on frictionless ice. What happens to its velocity?", answer_index: 1 })
    expect(await bank("Inertia and velocity on ice", "hi")).toEqual([]) // other language
    expect(await bank("photosynthesis chlorophyll")).toEqual([]) // unrelated
    expect(await errorOf(t.query(`select public.app_teacher_questions('wrong', $1, 'ice', 'en', 5)`, [profId]))).toMatch(/server key|forbidden|denied/i)
  })

  it("is private to the professor; others can't read or edit it", async () => {
    await asProfessor()
    const id = await save("A puck slides on frictionless ice. What happens to its velocity?")
    await asLearner()
    expect(await t.query(`select id from public.professor_bank_questions`)).toEqual([])
    expect(await errorOf(save("Edited by a learner?", { id }))).toMatch(/not_professor/)
    await t.query(`delete from public.professor_bank_questions where id = $1`, [id])
    await asProfessor()
    expect(await t.query(`select id from public.professor_bank_questions`)).toHaveLength(1)
    await save("Edited question about ice?", { id })
    expect((await t.one<{ question: string }>(`select question from public.professor_bank_questions`))!.question).toBe("Edited question about ice?")
  })
})

describe("inbox", () => {
  let questionIds: string[]

  beforeEach(async () => {
    await goLive()
    await asLearner()
    const { id: courseId } = (await t.one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
      SERVER_KEY,
      JSON.stringify({ title: "Mechanics", summary: "s", level: "beginner", goal: "g", category: "science", subcategory: "physics", professor: `p:${profId}` }),
      JSON.stringify([{ title: "Module 1", summary: "s", lessons: [{ title: "Inertia", objective: "o", est_minutes: 20 }] }]),
    ]))!
    await t.asOwner()
    const lessonId = (await t.one<{ id: string }>(`select id from public.lessons where course_id = $1`, [courseId]))!.id
    questionIds = []
    for (let i = 0; i < 4; i++) {
      questionIds.push(
        (await t.one<{ id: string }>(
          `insert into public.professor_questions (user_id, lesson_id, question, reply, verdict, status) values ($1, $2, $3, 'The AI says so.', 'answer', 'answered') returning id`,
          [USER_B, lessonId, `Why does the puck keep moving? (${i})`],
        ))!.id,
      )
    }
  })

  const flag = (id: string, note = "My teacher said otherwise") => t.one<{ id: string }>(`select public.flag_for_professor($1, $2) as id`, [id, note])

  it("sends a learner's question to the professor without saying who they are, and returns the reply", async () => {
    await asLearner()
    const { id } = (await flag(questionIds[0]))!
    expect(await errorOf(flag(questionIds[0]))).toMatch(/already_sent/)

    await asProfessor()
    const inbox = (await t.one<{ i: Record<string, unknown>[] }>(`select public.professor_inbox() as i`))!.i
    expect(inbox).toHaveLength(1)
    expect(inbox[0]).toMatchObject({ id, lesson_title: "Inertia", question: "Why does the puck keep moving? (0)", ai_reply: "The AI says so.", note: "My teacher said otherwise", status: "open" })
    expect(JSON.stringify(inbox)).not.toContain(USER_B)
    expect(await t.query(`select id from public.professor_flags`)).toEqual([]) // the table itself isn't visible to professors

    expect(await errorOf(t.query(`select public.professor_reply_flag($1, 'answered', '  ')`, [id]))).toMatch(/reply_required/)
    await t.query(`select public.professor_reply_flag($1, 'answered', 'Friction is tiny on ice, so it keeps going.')`, [id])

    await asLearner()
    expect(await t.one(`select status, professor_reply from public.professor_flags`)).toEqual({
      status: "answered",
      professor_reply: "Friction is tiny on ice, so it keeps going.",
    })
    await t.asUser(USER_C)
    expect(await t.query(`select id from public.professor_flags`)).toEqual([])
    expect(await errorOf(t.query(`select public.professor_reply_flag($1, 'confirmed', null)`, [id]))).toMatch(/not_professor/)
  })

  it("allows 3 a day, only for your own answered questions, only while the professor is live", async () => {
    await t.asUser(USER_C)
    expect(await errorOf(flag(questionIds[0]))).toMatch(/not_found/)
    await asLearner()
    for (const id of questionIds.slice(0, 3)) await flag(id)
    expect(await errorOf(flag(questionIds[3]))).toMatch(/flag_limit/)

    await t.asOwner()
    await t.query(`delete from public.professor_flags`)
    await asAdmin()
    await t.query(`select public.admin_set_professor_live($1, false)`, [profId])
    await asLearner()
    expect(await errorOf(flag(questionIds[3]))).toMatch(/not_professor_course/)
  })
})
