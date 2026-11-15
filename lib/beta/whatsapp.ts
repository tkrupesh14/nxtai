// Closed beta: the welcome message an admin sends on WhatsApp after approving a tester (Admin → Beta).
// Opens WhatsApp (app on phones, WhatsApp Web on computers) with the message typed in; the admin presses Send.

const firstName = (name: string | null | undefined) => {
  const first = (name ?? "").replace(/\s+/g, " ").trim().split(" ")[0] ?? ""
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : ""
}

export function betaWelcomeMessage({ name, proDays }: { name: string | null | undefined; proDays: number | null | undefined }) {
  const hi = firstName(name)
  return [
    `Hi${hi ? ` ${hi}` : ""}! 🎉 You're in: welcome to the Krpex beta.`,
    "",
    `Krpex courses, Krpex Code and Krpex Community are now open to you${proDays ? `, with *Pro free for ${proDays} days*` : ""}.`,
    "",
    "👉 Start here: https://krpex.in/learn",
    "",
    "When something breaks, confuses you or could be better, tap the *Feedback* button on any page. Every report helps.",
    "",
    "Thanks for helping us build Krpex! 🙏",
  ].join("\n")
}

/** wa.me link for a number stored as +<country code><number> (migration 046), with the message filled in. */
export function whatsappLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, "")
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
