import { describe, expect, it } from "vitest"

import { getSubcategory } from "@/lib/learning/catalog"
import { CATALOG, lessonCount } from "@/lib/learning/course-catalog"

describe("ready-made course catalog", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = CATALOG.map((c) => c.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(CATALOG.map((c) => [c.slug, c] as const))("%s fits the course limits", (_, c) => {
    expect(getSubcategory(c.category, c.subcategory)).not.toBeNull()
    // app_create_course accepts 1-8 modules and keeps at most 6 lessons per module.
    expect(c.modules.length).toBeGreaterThanOrEqual(3)
    expect(c.modules.length).toBeLessThanOrEqual(8)
    for (const m of c.modules) {
      expect(m.lessons.length).toBeGreaterThanOrEqual(2)
      expect(m.lessons.length).toBeLessThanOrEqual(6)
      for (const l of m.lessons) {
        expect(l.est_minutes).toBeGreaterThanOrEqual(10)
        expect(l.est_minutes).toBeLessThanOrEqual(90)
        expect(l.objective).toMatch(/^[A-Z][a-z-]+[ ,].*\.$/) // a sentence starting with a verb
        expect(l.title.length).toBeLessThanOrEqual(200)
      }
    }
    expect(lessonCount(c)).toBeGreaterThanOrEqual(10)
    expect(c.title.length).toBeLessThanOrEqual(60)
    expect(c.outcomes.length).toBeGreaterThanOrEqual(3)
  })

  it("covers every subject area", () => {
    expect(new Set(CATALOG.map((c) => c.category)).size).toBeGreaterThanOrEqual(9)
  })
})
