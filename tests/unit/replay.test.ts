// Session replay (beta B.4) never runs on private pages.
import { describe, expect, it, vi } from "vitest"

vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123")

describe("replay pages", async () => {
  const { replayAllowed } = await import("@/lib/beta/replay")
  it("skips account, payments, admin, the professor portal and sign-in", () => {
    for (const p of ["/account", "/account/feedback", "/admin", "/admin/beta", "/teach", "/login", "/create-account", "/reset-password"]) expect(replayAllowed(p)).toBe(false)
    for (const p of ["/learn", "/", "/problems", "/p/two-sum", "/c/help", "/accounting-basics", "/beta"]) expect(replayAllowed(p)).toBe(true)
  })
})
