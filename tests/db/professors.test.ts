// Professor portal (8.1): invites, profiles, material uploads, and who can see what.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
const PROF_EMAIL = "prof@example.com"

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A, PROF_EMAIL)
  await t.addUser(USER_B, "learner@example.com")
  await t.addUser(USER_ADMIN, "admin@example.com")
  await t.asOwner()
  await t.query(`insert into private.admins (user_id) values ($1)`, [USER_ADMIN])
})

const invite = async (email = PROF_EMAIL) => {
  await t.asUser(USER_ADMIN)
  return (await t.one<{ tok: string }>(`select public.admin_create_professor_invite($1, 'science/physics') as tok`, [email]))!.tok
}
const accept = (tok: string) => t.query(`select public.accept_professor_invite($1, 'Dr. Asha Rao', 'draft-2026-11-04')`, [tok])
const status = async (tok: string) => (await t.one<{ s: { status: string } }>(`select public.professor_invite_status($1) as s`, [tok]))!.s.status

const sections = JSON.stringify([
  { heading: "Newton's laws", page_from: 1, page_to: 2, body: "A body stays at rest unless acted on by a force." },
  { heading: "Momentum", page_from: 3, page_to: 3, body: "p = mv" },
])
const upload = (pages = 3) =>
  t.one<{ id: string }>(`select public.app_add_professor_material($1, 'Mechanics notes', 'pdf', 'hi', 'Mechanics', $2, 500, $3) as id`, [
    SERVER_KEY,
    pages,
    sections,
  ])

const makeProfessor = async () => {
  const tok = await invite()
  await t.asUser(USER_A)
  await accept(tok)
}
const approve = async () => {
  await t.asOwner()
  const { id } = (await t.one<{ id: string }>(`select id from public.professors where user_id = $1`, [USER_A]))!
  await t.asUser(USER_ADMIN)
  await t.query(`select public.admin_set_professor_status($1, 'approved')`, [id])
  await t.asUser(USER_A)
}

describe("invites", () => {
  it("only admins can invite", async () => {
    await t.asUser(USER_B)
    expect(await errorOf(t.query(`select public.admin_create_professor_invite('x@example.com', 'science/physics')`))).toMatch(/admin only/)
    await t.asAnon()
    expect(await errorOf(t.query(`select public.admin_create_professor_invite('x@example.com', 'science/physics')`))).toMatch(/permission denied/)
  })

  it("stores only the token's hash", async () => {
    const tok = await invite()
    expect(tok).toMatch(/^[0-9a-f]{64}$/)
    await t.asOwner()
    const row = await t.one<{ token_hash: string }>(`select token_hash from private.professor_invites`)
    expect(row!.token_hash).not.toBe(tok)
  })

  it("works once, for the invited email only", async () => {
    const tok = await invite()
    await t.asUser(USER_B)
    expect(await status(tok)).toBe("wrong_email")
    expect(await errorOf(accept(tok))).toMatch(/wrong_email/)

    await t.asUser(USER_A)
    expect(await status(tok)).toBe("ok")
    await accept(tok)
    const me = await t.one<{ status: string; display_name: string; agreement_version: string }>(`select status, display_name, agreement_version from public.professors`)
    expect(me).toEqual({ status: "pending", display_name: "Dr. Asha Rao", agreement_version: "draft-2026-11-04" })
    expect(await status(tok)).toBe("already_professor")
    expect(await errorOf(accept(tok))).toMatch(/invite_invalid/)
  })

  it("rejects unknown, revoked and expired tokens", async () => {
    await t.asUser(USER_A)
    expect(await status("nope")).toBe("not_found")
    const tok = await invite()
    const { id } = (await t.one<{ id: string }>(`select (public.admin_professors()->'invites'->0->>'id')::uuid as id`))!
    await t.query(`select public.admin_revoke_professor_invite($1)`, [id])
    await t.asUser(USER_A)
    expect(await status(tok)).toBe("not_found")

    const tok2 = await invite()
    await t.asOwner()
    await t.query(`update private.professor_invites set expires_at = now() - interval '1 minute' where revoked_at is null`)
    await t.asUser(USER_A)
    expect(await status(tok2)).toBe("expired")
    expect(await errorOf(accept(tok2))).toMatch(/invite_invalid/)
  })
})

describe("profiles", () => {
  it("a professor edits only their own profile; learners see none", async () => {
    await makeProfessor()
    await t.query(`select public.professor_update_profile('Dr. Asha Rao', 'Associate Professor', 'IIT Bombay', 'Bio', '{en,hi}', 'PhD')`)
    expect(await t.one(`select title, institution, languages from public.professors`)).toEqual({
      title: "Associate Professor",
      institution: "IIT Bombay",
      languages: ["en", "hi"],
    })
    expect(await errorOf(t.query(`select public.professor_update_profile('X Y', null, null, null, '{fr}', null)`))).toMatch(/check/)
    expect(await errorOf(t.query(`update public.professors set status = 'approved'`))).toMatch(/permission denied/)

    await t.asUser(USER_B)
    expect(await t.query(`select * from public.professors`)).toHaveLength(0)
    expect(await errorOf(t.query(`select public.professor_update_profile('Hacker', null, null, null, '{en}', null)`))).toMatch(/not_professor/)
  })
})

describe("material", () => {
  it("needs a professor and the server key", async () => {
    await t.asUser(USER_B)
    expect(await errorOf(upload())).toMatch(/not_professor/)
    await makeProfessor()
    expect(await errorOf(t.query(`select public.app_add_professor_material('wrong', 't', 'pdf', 'en', null, 1, 1, $1)`, [sections]))).not.toBeNull()
  })

  it("is private to its professor and can be withdrawn for good", async () => {
    await makeProfessor()
    const { id } = (await upload())!
    expect(await t.query(`select heading from public.professor_material_sections order by idx`)).toEqual([
      { heading: "Newton's laws" },
      { heading: "Momentum" },
    ])
    await t.asUser(USER_B)
    expect(await t.query(`select * from public.professor_materials`)).toHaveLength(0)
    expect(await t.query(`select * from public.professor_material_sections`)).toHaveLength(0)
    await t.query(`delete from public.professor_materials where id = $1`, [id])

    await t.asUser(USER_A)
    expect(await t.query(`select * from public.professor_materials`)).toHaveLength(1)
    await t.query(`delete from public.professor_materials where id = $1`, [id])
    await t.asOwner()
    expect(await t.query(`select * from public.professor_material_sections`)).toHaveLength(0)
  })

  it("is published only by approved professors", async () => {
    await makeProfessor()
    const { id } = (await upload())!
    expect(await errorOf(t.query(`select public.professor_set_material_status($1, 'published')`, [id]))).toMatch(/not_approved/)
    await approve()
    await t.query(`select public.professor_set_material_status($1, 'published')`, [id])
    expect(await t.one(`select status from public.professor_materials`)).toEqual({ status: "published" })
    expect(await errorOf(t.query(`update public.professor_materials set status = 'draft'`))).toMatch(/permission denied/)
  })

  it("stops uploads from suspended professors and enforces the page allowance", async () => {
    await makeProfessor()
    expect(await errorOf(upload(5001))).toMatch(/too_many_pages|check/)
    await t.asOwner()
    await t.query(`update public.professors set status = 'suspended'`)
    await t.asUser(USER_A)
    expect(await errorOf(upload())).toMatch(/suspended/)
  })

  it("admin sees professors with their counts", async () => {
    await makeProfessor()
    await upload()
    await t.asUser(USER_ADMIN)
    const data = (await t.one<{ d: { professors: { email: string; materials: number; pages: number; status: string }[] } }>(`select public.admin_professors() as d`))!.d
    expect(data.professors).toEqual([expect.objectContaining({ email: PROF_EMAIL, materials: 1, pages: 3, status: "pending" })])
  })
})

describe("model lessons", () => {
  const blocks = JSON.stringify([{ type: "opening", title: "", body_markdown: "Namaste", items: [], checkpoint: null, diagram: null }])
  const save = (id: string | null = null, title = "Newton's laws") =>
    t.one<{ id: string }>(`select public.professor_save_lesson($1, $2, 'Mechanics', 'hi', 'Use F = ma', $3, '["F = ma"]') as id`, [id, title, blocks])

  it("are saved, edited and removed by their professor only", async () => {
    await t.asUser(USER_B)
    expect(await errorOf(save())).toMatch(/not_professor/)
    await makeProfessor()
    const { id } = (await save())!
    await save(id, "Newton's three laws")
    expect(await t.one(`select title, language, status from public.professor_lessons`)).toEqual({ title: "Newton's three laws", language: "hi", status: "draft" })
    expect(await errorOf(t.query(`update public.professor_lessons set status = 'published'`))).toMatch(/permission denied/)

    await t.asUser(USER_B)
    expect(await t.query(`select * from public.professor_lessons`)).toHaveLength(0)
    await t.query(`delete from public.professor_lessons where id = $1`, [id])
    await t.asUser(USER_A)
    expect(await t.query(`select * from public.professor_lessons`)).toHaveLength(1)
    await t.query(`delete from public.professor_lessons where id = $1`, [id])
    expect(await t.query(`select * from public.professor_lessons`)).toHaveLength(0)
  })

  it("can't be edited by another professor, and need approval to publish", async () => {
    await makeProfessor()
    const { id } = (await save())!
    expect(await errorOf(t.query(`select public.professor_set_lesson_status($1, 'published')`, [id]))).toMatch(/not_approved/)
    await approve()
    await t.query(`select public.professor_set_lesson_status($1, 'published')`, [id])
    expect(await t.one(`select status from public.professor_lessons`)).toEqual({ status: "published" })

    // A second professor can't touch it.
    await t.addUser("00000000-0000-0000-0000-0000000000c1", "other@example.com")
    const tok = await invite("other@example.com")
    await t.asUser("00000000-0000-0000-0000-0000000000c1")
    await accept(tok)
    expect(await errorOf(save(id, "Hijacked"))).toMatch(/not_found/)
    expect(await errorOf(t.query(`select public.professor_set_lesson_status($1, 'draft')`, [id]))).toMatch(/not_found/)
  })

  it("rejects empty or oversized lessons, and suspended professors", async () => {
    await makeProfessor()
    expect(await errorOf(t.query(`select public.professor_save_lesson(null, 'Title', null, 'en', null, '[]', '[]')`))).toMatch(/check/)
    expect(await errorOf(t.query(`select public.professor_save_lesson(null, 'Title', null, 'fr', null, $1, '[]')`, [blocks]))).toMatch(/check/)
    await t.asOwner()
    await t.query(`update public.professors set status = 'suspended'`)
    await t.asUser(USER_A)
    expect(await errorOf(save())).toMatch(/suspended/)
  })
})

describe("review queue", () => {
  const blocks = JSON.stringify([
    { type: "opening", title: "", body_markdown: "Hello", items: [], checkpoint: null, diagram: null },
    { type: "explanation", title: "F = ma", body_markdown: "Force", items: [], checkpoint: null, diagram: null },
  ])
  const addLesson = async (language = "en") => {
    await t.asUser(USER_ADMIN)
    const { id } = (await t.one<{ id: string }>(
      `select public.admin_add_review_lesson('science/physics', $1, 'Class 11–12 (school)', 'Newton''s second law', null, $2, '[]', '[]') as id`,
      [language, blocks],
    ))!
    return id
  }
  const submit = (id: string, notes = "[]", overall = 4) =>
    t.query(`select public.professor_submit_review($1, 5, 4, 3, $2, 'Good start', $3)`, [id, overall, notes])

  it("only admins add lessons", async () => {
    await t.asUser(USER_B)
    expect(await errorOf(t.query(`select public.admin_add_review_lesson('science/physics', 'en', 'School', 'Title', null, $1, '[]', '[]')`, [blocks]))).toMatch(/admin only/)
    await t.asAnon()
    expect(await errorOf(t.query(`select public.admin_review_lessons()`))).toMatch(/permission denied/)
  })

  it("is shown to approved professors in their languages only", async () => {
    const en = await addLesson("en")
    await addLesson("hi")
    await makeProfessor()
    expect(await t.query(`select * from public.review_lessons`)).toHaveLength(0) // pending
    expect(await errorOf(submit(en))).toMatch(/not_approved/)
    await approve()
    expect(await t.query(`select language from public.review_lessons`)).toEqual([{ language: "en" }])
    await t.asUser(USER_B)
    expect(await t.query(`select * from public.review_lessons`)).toHaveLength(0)
    expect(await errorOf(submit(en))).toMatch(/not_professor/)
  })

  it("takes one review per professor, which they can update and only they see", async () => {
    const id = await addLesson()
    await makeProfessor()
    await approve()
    await submit(id, JSON.stringify([{ block: 1, note: "Say what F is", suggestion: "" }]))
    await submit(id, "[]", 2)
    expect(await t.query(`select overall, comment, block_notes from public.lesson_reviews`)).toEqual([
      { overall: 2, comment: "Good start", block_notes: [] },
    ])
    await t.asUser(USER_B)
    expect(await t.query(`select * from public.lesson_reviews`)).toHaveLength(0)

    await t.asUser(USER_ADMIN)
    const data = (await t.one<{ d: { reviews: { professor: string; overall: number }[] }[] }>(`select public.admin_review_lessons() as d`))!.d
    expect(data[0].reviews).toEqual([expect.objectContaining({ professor: "Dr. Asha Rao", overall: 2 })])
  })

  it("rejects bad ratings and notes, and closed lessons", async () => {
    const id = await addLesson()
    await makeProfessor()
    await approve()
    expect(await errorOf(submit(id, "[]", 6))).toMatch(/check/)
    expect(await errorOf(submit(id, JSON.stringify([{ block: 2, note: "x", suggestion: "" }])))).toMatch(/invalid_notes/)
    expect(await errorOf(submit(id, JSON.stringify([{ block: 0, note: " ", suggestion: "" }])))).toMatch(/invalid_notes/)
    expect(await errorOf(t.query(`insert into public.lesson_reviews (review_lesson_id, professor_id, accuracy, clarity, level_fit, overall) select $1, id, 5, 5, 5, 5 from public.professors`, [id]))).toMatch(/permission denied/)

    await t.asUser(USER_ADMIN)
    await t.query(`select public.admin_set_review_lesson_status($1, 'closed')`, [id])
    await t.asUser(USER_A)
    expect(await t.query(`select * from public.review_lessons`)).toHaveLength(0)
    expect(await errorOf(submit(id))).toMatch(/not_found/)
  })
})

describe("lecture recordings", () => {
  const start = (seconds = 600) =>
    t.one<{ id: string }>(`select public.app_start_recording($1, 'Lecture 1', 'hi', 'Mechanics', 'lecture.mp3', 1000, $2) as id`, [SERVER_KEY, seconds])
  const update = (id: string, status: string, transcript: string | null = null, seconds: number | null = null) =>
    t.query(`select public.app_update_recording($1, $2, $3, 'job-1', $4, $5, null)`, [SERVER_KEY, id, status, transcript, seconds])

  it("needs a professor and the server key", async () => {
    await t.asUser(USER_B)
    expect(await errorOf(start())).toMatch(/not_professor/)
    await makeProfessor()
    expect(await errorOf(t.query(`select public.app_start_recording('wrong', 'T', 'en', null, 'a.mp3', 1, 60)`))).not.toBeNull()
  })

  it("goes from upload to a corrected transcript, private to its professor", async () => {
    await makeProfessor()
    const { id } = (await start())!
    await update(id, "transcribing")
    await update(id, "ready", "[0:00] Force equals mass times acceleration.", 95)
    expect(await t.one(`select status, seconds, job_id from public.professor_recordings`)).toEqual({ status: "ready", seconds: 95, job_id: "job-1" })
    await t.query(`select public.professor_save_transcript($1, '[0:00] F = ma.')`, [id])
    expect(await errorOf(update(id, "ready"))).toMatch(/not_found/) // finished recordings can't be moved back
    expect(await errorOf(t.query(`update public.professor_recordings set seconds = 1`))).toMatch(/permission denied/)

    await t.asUser(USER_B)
    expect(await t.query(`select * from public.professor_recordings`)).toHaveLength(0)
    expect(await errorOf(t.query(`select public.professor_save_transcript($1, 'hacked')`, [id]))).toMatch(/not_found/)

    // Added as material ('lecture'), then linked.
    await t.asUser(USER_A)
    const { id: material } = (await t.one<{ id: string }>(
      `select public.app_add_professor_material($1, 'Lecture 1', 'lecture', 'hi', null, 1, 20, '[{"heading":"Lecture 1 (from 0:00)","body":"F = ma."}]') as id`,
      [SERVER_KEY],
    ))!
    await t.query(`select public.app_recording_added($1, $2, $3)`, [SERVER_KEY, id, material])
    expect(await t.one(`select status, material_id from public.professor_recordings`)).toEqual({ status: "added", material_id: material })
    expect(await errorOf(t.query(`select public.professor_save_transcript($1, 'late edit')`, [id]))).toMatch(/not_found/)
  })

  it("enforces 2 hours a file, 3 at a time and 600 minutes a month (failed ones don't count)", async () => {
    await makeProfessor()
    expect(await errorOf(start(7201))).toMatch(/too_long|check/)
    const ids = [(await start(7200))!.id, (await start(7200))!.id, (await start(7200))!.id]
    expect(await errorOf(start(60))).toMatch(/too_many_in_progress/)
    await update(ids[0], "failed", null, 7200)
    await update(ids[1], "ready", "text", 7200)
    await update(ids[2], "ready", "text", 7200)
    // Counted this month: 2 × 120 min (the failed one doesn't count). Add 3 × 7,000 s (350 min) more: 590 min.
    await t.asOwner()
    await t.query(
      `insert into public.professor_recordings (professor_id, title, language, filename, bytes, seconds, status)
       select professor_id, 'Old', 'en', 'old.mp3', 1, 7000, 'ready' from public.professor_recordings, generate_series(1, 3) where id = $1`,
      [ids[1]],
    )
    await t.asUser(USER_A)
    expect(await errorOf(start(11 * 60))).toMatch(/monthly_limit/)
    await start(10 * 60) // exactly 600 minutes
  })
})
