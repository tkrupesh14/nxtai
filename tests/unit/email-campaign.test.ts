import { describe, expect, it } from "vitest"

import { firstName, renderCampaign, withRef } from "@/lib/email/campaign"
import { cleanContacts, countSkipped, findColumns, parseCsv } from "@/lib/email/contacts-csv"
import { sesEvent, snsStringToSign, type SnsMessage } from "@/lib/email/sns"

const C = { subject: "Hi {{name}}, join the beta", preview: "Pro free", from_name: "Krpex", slug: "beta-invite", body: "" }

describe("campaign rendering", () => {
  it("renders the Markdown subset, escapes HTML, tracks links and adds ?ref to Krpex links", () => {
    const body = [
      "Hi {{name}},",
      "We built **Krpex**. See [the site](https://krpex.in/learn) or [GitHub](https://github.com/x).",
      "# What you get",
      "- Courses\n- 150 problems",
      "[[Apply now](https://krpex.in/beta)]",
      "<script>alert(1)</script>",
    ].join("\n\n")
    const m = renderCampaign({ ...C, body }, { name: "asha rao", token: "a".repeat(32), trackLink: (u) => `T(${u})` })
    expect(m.subject).toBe("Hi Asha, join the beta")
    expect(m.html).toContain("Hi Asha,")
    expect(m.html).toContain("<strong>Krpex</strong>")
    expect(m.html).toContain('href="T(https://krpex.in/learn?ref=email-beta-invite)"')
    expect(m.html).toContain('href="T(https://github.com/x)"')
    expect(m.html).toContain(">Apply now</a>")
    expect(m.html).toContain("<li style=\"margin:0 0 6px;\">150 problems</li>")
    expect(m.html).not.toContain("<script>")
    expect(m.html).toContain(`/api/email/o/${"a".repeat(32)}`)
    expect(m.html).toContain("part of the Krpex community")
    expect(m.html).not.toContain("signed up for")
    expect(m.oneClickUrl).toBe(`https://krpex.in/api/email/u?t=${"a".repeat(32)}`)
    expect(m.text).toContain("Apply now: https://krpex.in/beta?ref=email-beta-invite")
    expect(m.text).toContain("the site (https://krpex.in/learn?ref=email-beta-invite)")
  })

  it("test sends have no tracking", () => {
    const m = renderCampaign({ ...C, body: "[x](https://krpex.in)" }, { token: null, trackLink: () => "TRACKED" })
    expect(m.html).not.toContain("TRACKED")
    expect(m.html).not.toContain("/api/email/o/")
    expect(m.html).toContain("Hi there".slice(0, 0))
  })

  it("names and refs", () => {
    expect(firstName(null)).toBe("there")
    expect(firstName("  dhruv garg ")).toBe("Dhruv")
    expect(withRef("https://code.krpex.in/p?x=1", "s")).toBe("https://code.krpex.in/p?x=1&ref=email-s")
    expect(withRef("https://krpex.in/beta?ref=keep", "s")).toBe("https://krpex.in/beta?ref=keep")
    expect(withRef("https://evilkrpex.in/", "s")).toBe("https://evilkrpex.in/")
  })
})

describe("contact import", () => {
  it("parses a Google Form export and cleans it", () => {
    const csv =
      'Timestamp,Name,Email Address,Mobile no (Whatapp no),College,Year,"Share the url, please"\r\n' +
      '1/3/2023,Asha Rao,Asha@Gmail.com,7011518320,"JIIT, Noida",2,https://x\r\n' +
      "1/4/2023,Dhruv,dhruv@gmail,8054699780,CU,3,\r\n" +
      "1/5/2023,V,v_t@banasthali.in,1,BV,2,\r\n" +
      "1/5/2023,Dup,asha@gmail.com,1,,,\r\n" +
      "1/6/2023,T,typo@gmial.com,1,,,\r\n" +
      "1/6/2023,I,info@gmail.com,1,,,\r\n" +
      '1/7/2023,"Quote ""Q""",q@outlook.com,1,,4,\r\n'
    const rows = parseCsv(csv)
    expect(findColumns(rows[0])).toEqual({ email: 2, name: 1, college: 4, year: 5 })
    const r = cleanContacts(rows, { personalOnly: true })
    expect(r.contacts).toEqual([
      { email: "asha@gmail.com", name: "Asha Rao", college: "JIIT, Noida", year: "2" },
      { email: "q@outlook.com", name: 'Quote "Q"', college: null, year: "4" },
    ])
    expect(countSkipped(r.skipped)).toEqual({ invalid: 1, not_personal: 1, duplicate: 1, typo: 1, role: 1 })
    expect(cleanContacts(rows, { personalOnly: false }).contacts.map((c) => c.email)).toContain("v_t@banasthali.in")
    expect(cleanContacts([["Name"], ["x"]], { personalOnly: false }).error).toMatch(/email column/)
  })
})

describe("SES events over SNS", () => {
  it("builds the string AWS signs and reads SES events", () => {
    const m = { Type: "Notification", Message: "m", MessageId: "id", Timestamp: "t", TopicArn: "arn", Signature: "", SignatureVersion: "1", SigningCertURL: "" } as SnsMessage
    expect(snsStringToSign(m)).toBe("Message\nm\nMessageId\nid\nTimestamp\nt\nTopicArn\narn\nType\nNotification\n")
    expect(sesEvent(JSON.stringify({ eventType: "Bounce", mail: { messageId: "x" }, bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "A@b.com" }] } }))).toEqual({
      messageId: "x",
      type: "bounce",
      emails: ["a@b.com"],
    })
    expect(sesEvent(JSON.stringify({ eventType: "Bounce", mail: { messageId: "x" }, bounce: { bounceType: "Transient" } }))).toBeNull()
    expect(sesEvent(JSON.stringify({ notificationType: "Complaint", mail: { messageId: "y" }, complaint: { complainedRecipients: [{ emailAddress: "c@d.com" }] } }))?.type).toBe("complaint")
    expect(sesEvent(JSON.stringify({ eventType: "Delivery", mail: { messageId: "z" } }))).toEqual({ messageId: "z", type: "delivery", emails: [] })
    expect(sesEvent("not json")).toBeNull()
  })
})

describe("blocks", () => {
  it("splits headings and lists out of paragraphs", async () => {
    const { splitBlocks } = await import("@/lib/email/campaign")
    expect(splitBlocks("# What's inside\n- a\n- b\nAfter\n\nNext para\nline 2")).toEqual(["# What's inside", "- a\n- b", "After", "Next para\nline 2"])
  })
})
