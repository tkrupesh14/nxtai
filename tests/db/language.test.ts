// 8.3: the language a course is taught in, and the learner's default.
import { beforeEach, describe, expect, it } from "vitest"

import { createTestDb, errorOf, SERVER_KEY, USER_A, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.asUser(USER_A)
})

const create = (language?: string) =>
  t.one<{ id: string }>(`select public.app_create_course($1, $2, $3) as id`, [
    SERVER_KEY,
    JSON.stringify({ title: "Motion", summary: "s", level: "beginner", goal: "g", category: "science", subcategory: "physics", ...(language ? { language } : {}) }),
    JSON.stringify([{ title: "Module 1", summary: "s", lessons: [{ title: "Speed", objective: "o", est_minutes: 20 }] }]),
  ])

const languageOf = async (id: string) => (await t.one<{ language: string }>(`select language from public.courses where id = $1`, [id]))!.language

describe("course language", () => {
  it("is stored when the course is created; anything but Hindi is English", async () => {
    // (Two courses: the free plan's monthly allowance.)
    expect(await languageOf((await create("hi"))!.id)).toBe("hi")
    expect(await languageOf((await create("fr"))!.id)).toBe("en")
  })

  it("defaults to English and can't be changed directly by the learner", async () => {
    const { id } = (await create())!
    expect(await languageOf(id)).toBe("en")
    expect(await errorOf(t.query(`update public.courses set language = 'hi' where id = $1`, [id]))).toMatch(/permission denied/)
  })
})

describe("learner default language", () => {
  it("defaults to English, can be set to Hindi and nothing else", async () => {
    await t.query(`insert into public.learner_profiles (user_id, goal, level) values ($1, 'Learn physics', 'new')`, [USER_A])
    expect((await t.one<{ language: string }>(`select language from public.learner_profiles`))!.language).toBe("en")
    await t.query(`update public.learner_profiles set language = 'hi'`)
    expect((await t.one<{ language: string }>(`select language from public.learner_profiles`))!.language).toBe("hi")
    expect(await errorOf(t.query(`update public.learner_profiles set language = 'fr'`))).toMatch(/check constraint/)
  })
})
