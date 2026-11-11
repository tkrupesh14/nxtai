// Community 5b: post rules and messages (lib/community/posts.ts). The database side is tests/db/community-posts.test.ts.
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import { ago, COMMUNITY_ERRORS, communityError, isSection, KIND_SECTION, problemSpace, SECTION_KIND, spaceProblem } from "@/lib/community/posts"

describe("community posts", () => {
  it("map URL sections, kinds and spaces", () => {
    expect(isSection("solutions")).toBe(true)
    expect(isSection("solution")).toBe(false)
    expect(SECTION_KIND.discuss).toBe("discussion")
    expect(KIND_SECTION.solution).toBe("solutions")
    expect(problemSpace("two-sum")).toBe("code:p:two-sum")
    expect(spaceProblem("code:p:two-sum")).toBe("two-sum")
    expect(spaceProblem("course:physics")).toBeNull()
  })

  it("explain every error the learner-facing functions in migration 034 can raise", () => {
    const sql = readFileSync("supabase/migrations/20261120000034_community_posts.sql", "utf8")
    const learner = sql.split("-- ---------- moderation (admins) ----------")[0]
    const codes = new Set(Array.from(learner.matchAll(/raise exception '([a-z_0-9]+)'/g), (m) => m[1]))
    expect(codes.size).toBeGreaterThan(15)
    for (const c of codes) expect(COMMUNITY_ERRORS[c], c).toBeTruthy()
    expect(communityError("P0001: too_fast")).toBe(COMMUNITY_ERRORS.too_fast)
    expect(communityError("weird")).toMatch(/Something went wrong/)
  })

  it("write short dates", () => {
    const now = Date.parse("2026-11-10T12:00:00Z")
    expect(ago("2026-11-10T11:59:30Z", now)).toBe("just now")
    expect(ago("2026-11-10T11:15:00Z", now)).toBe("45 min ago")
    expect(ago("2026-11-10T07:00:00Z", now)).toBe("5 h ago")
    expect(ago("2026-11-08T12:00:00Z", now)).toBe("2 d ago")
    expect(ago("2026-10-01T12:00:00Z", now)).toBe("1 Oct")
  })
})
