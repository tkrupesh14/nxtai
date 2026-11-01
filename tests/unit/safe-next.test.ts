import { describe, expect, it } from "vitest"

import { safeNext } from "@/lib/safe-next"

describe("safeNext (where to go after login)", () => {
  it.each(["/learn", "/learn/abc?x=1", "/account/settings"])("allows same-site path %s", (p) => {
    expect(safeNext(p)).toBe(p)
  })
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "/learn\r\nSet-Cookie: x", "", null, undefined])(
    "rejects %s",
    (p) => {
      expect(safeNext(p as string | null | undefined)).toBe("/learn")
    },
  )
  it("uses the given fallback", () => {
    expect(safeNext("//x", "/account")).toBe("/account")
  })
})
