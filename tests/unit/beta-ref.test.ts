import { describe, expect, it } from "vitest"

import { betaRef } from "@/lib/beta/options"

describe("betaRef", () => {
  it("accepts link names and rejects anything else", () => {
    expect(betaRef(" PyDelhi ")).toBe("pydelhi")
    expect(betaRef("college-xyz-2026")).toBe("college-xyz-2026")
    for (const bad of ["", "-x", "a b", "<script>", "x".repeat(41), null, 5]) expect(betaRef(bad)).toBeNull()
  })
})

describe("whatsappNumber", () => {
  it("tidies Indian and international numbers", async () => {
    const { whatsappNumber } = await import("@/lib/beta/options")
    for (const ok of ["9876543210", "98765 43210", "+91 98765-43210", "09876543210", "919876543210", "(987) 654-3210"])
      expect(whatsappNumber(ok)).toBe("+919876543210")
    expect(whatsappNumber("+44 7700 900123")).toBe("+447700900123")
    for (const bad of ["", "12345", "5876543210", "abc", "+0123456789", "+1234567890123456", null]) expect(whatsappNumber(bad)).toBeNull()
  })
})
