import { describe, expect, it } from "vitest"

import { renderDigest, type DigestItem } from "@/lib/email/digest"

const item = (n: number, extra: Partial<DigestItem> = {}): DigestItem => ({
  id: `id-${n}`,
  title: `Title ${n}`,
  body: `Body ${n}`,
  link: "/teach#inbox",
  created_at: "2026-11-07T10:00:00Z",
  ...extra,
})

describe("notification email", () => {
  it("uses the notification's title as the subject when there is one, a count otherwise", () => {
    expect(renderDigest({ name: "Riya", items: [item(1)], token: "tok" }).subject).toBe("Title 1")
    expect(renderDigest({ name: "Riya", items: [item(1), item(2)], token: "tok" }).subject).toBe("You have 2 new notifications on Krpex")
  })

  it("links each notification on this site, and offers settings and unsubscribe", () => {
    const { text, html } = renderDigest({ name: "Riya", items: [item(1), item(2, { link: "//evil.example" })], token: "abc" })
    expect(text).toContain("Hi Riya,")
    expect(text).toContain("https://krpex.in/teach#inbox")
    expect(text).toContain("https://krpex.in/notifications") // unsafe link falls back
    expect(text).not.toContain("evil.example")
    expect(html).not.toContain("evil.example")
    expect(text).toContain("https://krpex.in/unsubscribe?t=abc")
    expect(html).toContain("https://krpex.in/account/settings#email")
  })

  it("escapes HTML and keeps the subject on one line", () => {
    const { subject, html } = renderDigest({
      name: "<b>x</b>",
      items: [item(1, { title: "Hi\r\nBcc: a@b.c <script>", body: "a & b" })],
      token: "t",
    })
    expect(subject).toBe("Hi Bcc: a@b.c <script>")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<b>x</b>")
    expect(html).toContain("a &amp; b")
  })

  it("shows at most 10 and says how many more", () => {
    const { text } = renderDigest({ name: "", items: Array.from({ length: 13 }, (_, i) => item(i)), token: "t" })
    expect(text.startsWith("Hi,")).toBe(true)
    expect(text).toContain("Title 9")
    expect(text).not.toContain("Title 10")
    expect(text).toContain("…and 3 more")
  })
})
