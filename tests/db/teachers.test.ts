// Professor-backed lessons (8.2): going live, public professor pages, and search over a live professor's material.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_ADMIN, USER_B, type TestDb } from "../support/db"

let t: TestDb
let profId: string

const SECTIONS = JSON.stringify([
  { heading: "Newton's laws", body: "Inertia: a body stays at rest unless a net force acts on it. Force equals mass times acceleration." },
  { heading: "Projectile motion", body: "Split the velocity into horizontal and vertical parts. Gravity only changes the vertical velocity." },
  { heading: "त्वरण", body: "त्वरण वेग में परिवर्तन की दर है। acceleration का SI मात्रक m/s² है।" },
])
const DRAFT = JSON.stringify([{ heading: "Secret draft", body: "Unpublished projectile notes about velocity." }])

const asProfessor = () => t.asUser(USER_A)
const asAdmin = () => t.asUser(USER_ADMIN)
const upload = async (title: string, sections: string) =>
  (await t.one<{ id: string }>(`select public.app_add_professor_material($1, $2, 'text', 'en', 'Mechanics', 2, 500, $3) as id`, [
    SERVER_KEY,
    title,
    sections,
  ]))!.id
const setLive = (live: boolean) => t.query(`select public.admin_set_professor_live($1, $2)`, [profId, live])
const profile = (style: string | null, listed: boolean | null) =>
  t.query(`select public.professor_update_profile('Dr. Asha Rao', 'Professor', 'IIT Bombay', 'Bio', '{en,hi}', 'PhD (private)', $1, $2)`, [style, listed])
const context = (query: string, chars = 20000) =>
  t.one<{ c: Record<string, unknown> | null }>(`select public.app_teacher_context($1, $2, $3, $4) as c`, [SERVER_KEY, profId, query, chars]).then((r) => r!.c)
const listed = async () => {
  await t.asAnon()
  return (await t.one<{ p: { id: string }[] }>(`select public.public_professors('science/physics') as p`))!.p
}

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

const approve = async () => {
  await asAdmin()
  await t.query(`select public.admin_set_professor_status($1, 'approved')`, [profId])
}

describe("going live", () => {
  it("needs the professor to ask, approval, and Krpex to make it live", async () => {
    await asProfessor()
    await profile("I derive every formula.", false)
    await asAdmin()
    expect(await errorOf(setLive(true))).toMatch(/not_ready/)
    await asProfessor()
    await profile("I derive every formula.", true)
    await asAdmin()
    expect(await errorOf(setLive(true))).toMatch(/not_ready/) // not approved yet
    await approve()
    expect(await listed()).toEqual([])
    await asAdmin()
    await setLive(true)
    const [p] = (await listed()) as Record<string, unknown>[]
    expect(p).toMatchObject({ id: profId, display_name: "Dr. Asha Rao", institution: "IIT Bombay", subject: "science/physics" })
    expect(JSON.stringify(p)).not.toMatch(/PhD|prof@example|derive/) // no credentials, email or teaching notes
    await t.asAnon()
    expect((await t.one<{ p: { id: string } }>(`select public.public_professor($1) as p`, [profId]))!.p.id).toBe(profId)
    expect((await t.one<{ p: unknown[] }>(`select public.public_professors('science/chemistry') as p`))!.p).toEqual([])
  })

  it("hides at once when the professor unticks it, is paused or is hidden", async () => {
    await asProfessor()
    await profile(null, true)
    await approve()
    await setLive(true)
    expect(await listed()).toHaveLength(1)

    // Saving the profile without the new fields (older callers) keeps them.
    await asProfessor()
    await t.query(`select public.professor_update_profile('Dr. Asha Rao', null, null, null, '{en}', null)`)
    expect(await listed()).toHaveLength(1)

    await asProfessor()
    await profile(null, false)
    expect(await listed()).toEqual([])
    await asProfessor()
    await profile(null, true) // asking again needs Krpex again
    expect(await listed()).toEqual([])

    await asAdmin()
    await setLive(true)
    await t.query(`select public.admin_set_professor_status($1, 'suspended')`, [profId])
    expect(await listed()).toEqual([])
    await asAdmin()
    await t.query(`select public.admin_set_professor_status($1, 'approved')`, [profId])
    expect(await listed()).toHaveLength(1)
    await asAdmin()
    await setLive(false)
    expect(await listed()).toEqual([])
  })

  it("only admins make professors live; the admin list shows the request", async () => {
    await asProfessor()
    await profile("Units first.", true)
    await approve()
    await t.asUser(USER_B)
    expect(await errorOf(setLive(true))).toMatch(/admin only/)
    await asAdmin()
    const p = (await t.one<{ p: Record<string, unknown> }>(`select public.admin_professors()->'professors'->0 as p`))!.p
    expect(p).toMatchObject({ teaching_style: "Units first.", listing_requested: true, live: false })
  })
})

describe("teacher context", () => {
  beforeEach(async () => {
    await approve()
    await asProfessor()
    await profile("I start from an everyday observation.", true)
    const published = await upload("Mechanics notes", SECTIONS)
    await upload("Draft notes", DRAFT)
    await t.query(`select public.professor_set_material_status($1, 'published')`, [published])
    const blocks = JSON.stringify([{ type: "opening", title: "Hello", body_markdown: "Let's throw a ball.", items: [], checkpoint: null, diagram: null }])
    for (const [title, topic] of [["Throwing balls", "Projectile motion"], ["Heat engines", "Thermodynamics"]]) {
      const { id } = (await t.one<{ id: string }>(`select public.professor_save_lesson(null, $1, $2, 'en', null, $3, '[]') as id`, [title, topic, blocks]))!
      await t.query(`select public.professor_set_lesson_status($1, 'published')`, [id])
    }
    await asAdmin()
    await setLive(true)
    await t.asUser(USER_B) // a learner whose course this professor teaches
  })

  it("needs the server key and a signed-in user", async () => {
    expect(await errorOf(t.query(`select public.app_teacher_context('nope', $1, 'force', 1000)`, [profId]))).toMatch(/server key/i)
    await t.asAnon()
    expect(await errorOf(context("force"))).toMatch(/permission denied/)
  })

  it("returns the style, the best-matching published sections and model lesson", async () => {
    const c = (await context("projectile velocity gravity"))!
    expect(c).toMatchObject({ display_name: "Dr. Asha Rao", teaching_style: "I start from an everyday observation." })
    const sections = c.sections as { heading: string; material: string }[]
    expect(sections[0]).toMatchObject({ heading: "Projectile motion", material: "Mechanics notes" })
    expect(sections.map((s) => s.heading)).not.toContain("Secret draft") // drafts are never used
    expect((c.example as { title: string }).title).toBe("Throwing balls")
    expect(JSON.stringify(c)).not.toMatch(/PhD/)
  })

  it("finds Hindi material, keeps to the budget, and matches nothing for unrelated words", async () => {
    const hindi = (await context("त्वरण क्या है"))!.sections as { heading: string }[]
    expect(hindi.map((s) => s.heading)).toEqual(["त्वरण"])
    const small = (await context("force acceleration velocity", 50))!.sections as { body: string }[]
    expect(small).toHaveLength(1)
    expect(small[0].body.length).toBeLessThanOrEqual(50)
    const none = (await context("photosynthesis chlorophyll"))!
    expect(none.sections).toEqual([])
    expect(none.example).not.toBeNull() // still an example of their teaching
  })

  it("is null once the professor isn't live, so courses fall back to the AI professor", async () => {
    await asAdmin()
    await setLive(false)
    await t.asUser(USER_B)
    expect(await context("force")).toBeNull()
  })
})
