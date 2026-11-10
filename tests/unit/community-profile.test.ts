// Community 5a: handle rules and messages (lib/community/profile.ts). The database side is in tests/db/public-profiles.test.ts.
import { describe, expect, it } from "vitest"

import { PROFILE_ERRORS, handleProblem, hasLink, nextHandleChange, normaliseHandle, profileError } from "@/lib/community/profile"

describe("public profile rules", () => {
  it("check handles", () => {
    expect(handleProblem("Asha_K")).toBeNull()
    expect(normaliseHandle("  Asha_K ")).toBe("asha_k")
    expect(handleProblem("ab")).toMatch(/3 to 20/)
    expect(handleProblem("a".repeat(21))).toMatch(/3 to 20/)
    expect(handleProblem("_asha")).toMatch(/lowercase/)
    expect(handleProblem("asha-k")).toMatch(/lowercase/)
    expect(handleProblem("admin")).toMatch(/reserved/)
    expect(handleProblem("krpex_fan")).toMatch(/reserved/)
  })

  it("spot links but not ordinary text", () => {
    for (const s of ["https://x.y", "www.example", "asha.dev", "site.in", "ABC.COM"]) expect(hasLink(s), s).toBe(true)
    for (const s of ["Final-year CSE student", "e.g. arrays", "3.14", "node.js and python", "notalink.comet"]) expect(hasLink(s), s).toBe(false)
  })

  it("explain database errors and the handle cooldown", () => {
    expect(profileError('new row: handle_taken')).toBe(PROFILE_ERRORS.handle_taken)
    expect(profileError("something else")).toMatch(/Couldn't save/)
    const now = Date.parse("2026-11-10T00:00:00Z")
    expect(nextHandleChange("2026-11-01T00:00:00Z", now)?.toISOString()).toBe("2026-12-01T00:00:00.000Z")
    expect(nextHandleChange("2026-10-01T00:00:00Z", now)).toBeNull()
  })
})
