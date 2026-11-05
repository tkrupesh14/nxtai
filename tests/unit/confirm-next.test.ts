import { describe, expect, it } from "vitest"

import { confirmNext } from "@/lib/auth/confirm-next"

const O = "https://krpex.in"

describe("confirmNext", () => {
  it("takes the page from the emailRedirectTo the app asked for", () => {
    // What the template's next={{ .RedirectTo }} becomes after the outer query is decoded.
    expect(confirmNext(`${O}/auth/callback?next=/onboarding`, "email", O)).toBe("/onboarding")
    expect(confirmNext(`${O}/auth/callback?next=/courses/python-fundamentals?start=1`, "email", O)).toBe(
      "/courses/python-fundamentals?start=1",
    )
    expect(confirmNext(`${O}/auth/callback?next=%2Freset-password`, "recovery", O)).toBe("/reset-password")
  })

  it("falls back by link type", () => {
    expect(confirmNext(null, "recovery", O)).toBe("/reset-password")
    expect(confirmNext(O, "email", O)).toBe("/learn") // RedirectTo is the Site URL when the app set none
    expect(confirmNext(`${O}/`, "email_change", O)).toBe("/account")
    expect(confirmNext("not a url", "email", O)).toBe("/learn")
  })

  it("never leaves the site", () => {
    expect(confirmNext("https://evil.example/auth/callback?next=/learn", "email", O)).toBe("/learn")
    expect(confirmNext(`${O}/auth/callback?next=//evil.example`, "email", O)).toBe("/learn")
    expect(confirmNext("//evil.example", "email", O)).toBe("/learn")
    expect(confirmNext("/teach", "email", O)).toBe("/teach")
  })
})
