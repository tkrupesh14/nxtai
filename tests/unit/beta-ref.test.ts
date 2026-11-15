import { describe, expect, it } from "vitest"

import { betaRef } from "@/lib/beta/options"

describe("betaRef", () => {
  it("accepts link names and rejects anything else", () => {
    expect(betaRef(" PyDelhi ")).toBe("pydelhi")
    expect(betaRef("college-xyz-2026")).toBe("college-xyz-2026")
    for (const bad of ["", "-x", "a b", "<script>", "x".repeat(41), null, 5]) expect(betaRef(bad)).toBeNull()
  })
})
