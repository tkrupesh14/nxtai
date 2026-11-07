import "server-only"

import nodemailer, { type Transporter } from "nodemailer"

/**
 * Outgoing mail through the Spacemail mailbox (the same one Supabase uses for sign-in emails).
 * Settings come from the environment: SMTP_USER and SMTP_PASSWORD are required; SMTP_HOST, SMTP_PORT and
 * EMAIL_FROM are optional. Never log them.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
}

let transport: Transporter | null = null

function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465)
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "mail.spacemail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
      pool: true,
      maxConnections: 1,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
  }
  return transport
}

export async function sendEmail(mail: {
  to: string
  subject: string
  text: string
  html: string
  /** One-click unsubscribe (RFC 8058): Gmail and Yahoo show an "Unsubscribe" button. */
  unsubscribe?: { url: string; oneClickUrl: string }
}): Promise<void> {
  if (!emailConfigured()) throw new Error("email is not configured")
  const from = process.env.EMAIL_FROM || `Krpex <${process.env.SMTP_USER}>`
  await getTransport().sendMail({
    from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: mail.unsubscribe
      ? {
          "List-Unsubscribe": `<${mail.unsubscribe.oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  })
}
