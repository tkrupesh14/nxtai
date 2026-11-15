import { describe, expect, it } from "vitest"

import { betaWelcomeMessage, whatsappLink } from "@/lib/beta/whatsapp"

describe("beta WhatsApp welcome", () => {
  it("greets by first name and mentions Pro only when given", () => {
    const m = betaWelcomeMessage({ name: "  asha  rao ", proDays: 30 })
    expect(m.startsWith("Hi Asha! 🎉 You're in")).toBe(true)
    expect(m).toContain("*Pro free for 30 days*")
    expect(m).toContain("https://krpex.in/learn")
    const plain = betaWelcomeMessage({ name: null, proDays: null })
    expect(plain.startsWith("Hi! 🎉")).toBe(true)
    expect(plain).not.toContain("Pro free")
  })

  it("builds wa.me links", () => {
    expect(whatsappLink("+919876543210")).toBe("https://wa.me/919876543210")
    expect(whatsappLink("+919876543210", "Hi & bye\n:)")).toBe("https://wa.me/919876543210?text=Hi%20%26%20bye%0A%3A)")
  })
})
