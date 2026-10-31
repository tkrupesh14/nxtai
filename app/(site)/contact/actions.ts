"use server"

import { createClient } from "@/lib/supabase/server"

export type ContactState = { status: "idle" | "success" | "error"; message?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get("company") ?? "").trim()) return { status: "success" }

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()

  if (!name || name.length > 200) return { status: "error", message: "Please enter your name." }
  if (!EMAIL_RE.test(email) || email.length > 320) return { status: "error", message: "Please enter a valid email address." }
  if (message.length < 5 || message.length > 5000)
    return { status: "error", message: "Please write a message (5 to 5,000 characters)." }

  const supabase = await createClient()
  const { error } = await supabase.from("contact_messages").insert({ name, email, message })

  if (error) {
    console.error("contact_messages insert failed:", error.code, error.message)
    return { status: "error", message: "We couldn't send your message right now. Please try again shortly." }
  }

  return { status: "success", message: "Thanks! Your message has been sent. We'll get back to you soon." }
}
