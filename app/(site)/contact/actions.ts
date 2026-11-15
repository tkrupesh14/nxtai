"use server"

import { after } from "next/server"

import { emailConfigured, sendEmail } from "@/lib/email/send"
import { LEGAL } from "@/lib/legal"
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

  // Tell the team (3.4), after the visitor has their answer; replying goes straight to the visitor.
  after(() => notifyTeam(name, email, message))
  return { status: "success", message: "Thanks! Your message has been sent. We'll get back to you soon." }
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

async function notifyTeam(name: string, email: string, message: string) {
  if (!emailConfigured()) return
  const to = process.env.CONTACT_EMAIL || LEGAL.email
  const oneLine = name.replace(/[\r\n]+/g, " ").slice(0, 80)
  try {
    await sendEmail({
      to,
      replyTo: { name: oneLine, address: email },
      subject: `Contact form: ${oneLine}`,
      text: `${name} <${email}> wrote on ${LEGAL.site}/contact:\n\n${message}\n\nReply to this email to answer them.`,
      html: `<p><strong>${escape(name)}</strong> &lt;${escape(email)}&gt; wrote on ${LEGAL.site}/contact:</p><p style="white-space:pre-wrap">${escape(message)}</p><p style="color:#666">Reply to this email to answer them.</p>`,
    })
  } catch (e) {
    // Never log the message or address; the message is saved in contact_messages either way.
    console.error("contact email failed:", e instanceof Error ? e.message : e)
  }
}
