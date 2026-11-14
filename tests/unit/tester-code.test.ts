// The tester code on session recordings (beta B.4) is the same in the browser and on the admin pages.
import { describe, expect, it } from "vitest"

import { testerCode } from "@/lib/beta/tester-code"
import { testerCodeSync } from "@/lib/beta/tester-code-server"

describe("tester code", () => {
  it("matches between browser and server, and reveals nothing readable", async () => {
    const id = "3f2b1c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d"
    const code = await testerCode(id)
    expect(code).toMatch(/^t-[0-9a-f]{10}$/)
    expect(testerCodeSync(id)).toBe(code)
    expect(await testerCode("00000000-0000-4000-8000-000000000001")).not.toBe(code)
  })
})
