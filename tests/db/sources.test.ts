// Courses from the learner's own material: upload limits, privacy, and attaching uploads to a new course.
import { beforeEach, describe, expect, it } from "vitest"

import { SOURCE_LIMITS } from "@/lib/sources/sections"

import { createTestDb, errorOf, SERVER_KEY, USER_A, USER_B, type TestDb } from "../support/db"

let t: TestDb

beforeEach(async () => {
  t = await createTestDb()
  await t.addUser(USER_A)
  await t.addUser(USER_B)
  await t.asUser(USER_A)
})

const sections = (n: number) =>
  JSON.stringify(Array.from({ length: n }, (_, i) => ({ heading: `Part ${i + 1}`, page_from: i + 1, page_to: i + 1, body: `Text of part ${i + 1}.` })))

const addSource = async (pages = 5, name = "notes.pdf", nSections = 3) =>
  (await t.one<{ id: string }>(`select public.app_add_source($1, $2, 'pdf', $3, 1000, $4) as id`, [SERVER_KEY, name, pages, sections(nSections)]))!.id

const makePro = async () => {
  await t.asOwner()
  await t.query(`insert into public.user_plans (user_id, plan, status, current_period_end) values ($1, 'pro', 'active', now() + interval '30 days')`, [USER_A])
  await t.asUser(USER_A)
}

const createWithSources = (sources: string[], lessons: { title: string; sections?: unknown }[]) =>
  t.one<{ id: string }>(`select public.app_create_course($1, $2, $3, $4) as id`, [
    SERVER_KEY,
    JSON.stringify({ title: "From my notes", summary: "s", level: "beginner", goal: "exam", category: "science", subcategory: "biology" }),
    JSON.stringify([{ title: "Module 1", summary: "s", lessons: lessons.map((l) => ({ ...l, objective: "o", est_minutes: 20 })) }]),
    `{${sources.join(",")}}`,
  ])

describe("uploads", () => {
  it("free plan: 1 file of up to 50 pages", async () => {
    expect(await errorOf(addSource(SOURCE_LIMITS.free.pages + 1))).toMatch(/too_many_pages/)
    await addSource(SOURCE_LIMITS.free.pages)
    expect(await errorOf(addSource(1, "second.pdf"))).toMatch(/too_many_files/)
  })

  it("pro plan: 3 files, 300 pages in total", async () => {
    await makePro()
    await addSource(200, "a.pdf")
    await addSource(90, "b.pdf")
    expect(await errorOf(addSource(20, "c.pdf"))).toMatch(/too_many_pages/)
    await addSource(10, "c.pdf")
    expect(await errorOf(addSource(1, "d.pdf"))).toMatch(/too_many_files/)
  })

  it("are private to the learner, who can remove them before building", async () => {
    const id = await addSource()
    expect(await t.query(`select id from public.course_source_sections where source_id = $1`, [id])).toHaveLength(3)

    await t.asUser(USER_B)
    expect(await t.query(`select id from public.course_sources`)).toEqual([])
    expect(await t.query(`select id from public.course_source_sections`)).toEqual([])
    await t.query(`delete from public.course_sources where id = $1`, [id])

    await t.asUser(USER_A)
    expect(await t.query(`select id from public.course_sources`)).toHaveLength(1)
    // Writes only go through the server functions.
    expect(await errorOf(t.query(`update public.course_source_sections set body = 'x'`))).toMatch(/permission denied/)
    expect(await errorOf(t.query(`insert into public.course_sources (user_id, filename, kind, pages, chars) values ($1, 'x', 'pdf', 1, 1)`, [USER_A]))).toMatch(/permission denied/)

    await t.query(`delete from public.course_sources where id = $1`, [id])
    expect(await t.query(`select id from public.course_source_sections`)).toEqual([])
    // With the upload gone, there's room for a new one.
    await addSource()
  })

  it("need the server key", async () => {
    expect(await errorOf(t.query(`select public.app_add_source('wrong', 'x', 'pdf', 1, 1, $1)`, [sections(1)]))).toBeTruthy()
  })

  it("are rate limited to 20 an hour", async () => {
    await makePro()
    for (let i = 0; i < 20; i++) {
      const id = await addSource(1, `f${i}.pdf`, 1)
      await t.query(`delete from public.course_sources where id = $1`, [id])
    }
    expect(await errorOf(addSource(1))).toMatch(/rate_limited/)
  })
})

describe("courses from uploads", () => {
  it("attach the files, number sections across them and keep each lesson's valid section numbers", async () => {
    await makePro()
    const a = await addSource(5, "a.pdf", 3)
    const b = await addSource(5, "b.pdf", 2)
    const { id } = (await createWithSources([b, a], [
      { title: "L1", sections: [1, 2, 2] },
      { title: "L2", sections: [5, 99, "3", "x"] },
      { title: "L3" },
    ]))!

    const files = await t.query<{ filename: string; position: number }>(`select filename, position from public.course_sources where course_id = $1 order by position`, [id])
    expect(files).toEqual([{ filename: "b.pdf", position: 0 }, { filename: "a.pdf", position: 1 }])
    // b.pdf's 2 sections come first (S1, S2), then a.pdf's 3 (S3–S5).
    const secs = await t.query<{ position: number; heading: string; f: string }>(
      `select s.position, s.heading, c.filename as f from public.course_source_sections s join public.course_sources c on c.id = s.source_id
        where s.course_id = $1 order by s.position`, [id])
    expect(secs.map((s) => `${s.position}:${s.f}:${s.heading}`)).toEqual(["1:b.pdf:Part 1", "2:b.pdf:Part 2", "3:a.pdf:Part 1", "4:a.pdf:Part 2", "5:a.pdf:Part 3"])

    const lessons = await t.query<{ source_sections: number[] | null }>(`select source_sections from public.lessons where course_id = $1 order by position`, [id])
    expect(lessons.map((l) => l.source_sections)).toEqual([[1, 2], [3, 5], []])

    // Attached files can't be deleted on their own (they go with the course).
    await t.query(`delete from public.course_sources where id = $1`, [a])
    expect(await t.query(`select id from public.course_sources where course_id = $1`, [id])).toHaveLength(2)
    // …and a new upload starts a fresh allowance.
    await addSource(300, "big.pdf")

    // Deleting the course removes its material.
    await t.asOwner()
    await t.query(`delete from public.courses where id = $1`, [id])
    expect(await t.query(`select id from public.course_source_sections where source_id in ($1, $2)`, [a, b])).toEqual([])
  })

  it("refuse someone else's or already-used uploads, and more files than the plan allows", async () => {
    await t.asUser(USER_B)
    const theirs = await addSource()
    await t.asUser(USER_A)
    expect(await errorOf(createWithSources([theirs], [{ title: "L1" }]))).toMatch(/invalid_sources/)

    const mine = await addSource()
    await createWithSources([mine], [{ title: "L1", sections: [1] }])
    expect(await errorOf(createWithSources([mine], [{ title: "L1" }]))).toMatch(/invalid_sources/)
    expect(await errorOf(createWithSources([mine, mine], [{ title: "L1" }]))).toMatch(/invalid_sources/)
  })

  it("courses without uploads work as before (no section numbers)", async () => {
    const { courseId } = await t.createCourse(2)
    const lessons = await t.query<{ source_sections: number[] | null }>(`select source_sections from public.lessons where course_id = $1`, [courseId])
    expect(lessons.map((l) => l.source_sections)).toEqual([null, null])
  })
})
