import "server-only"

import nodemailer, { type Transporter } from "nodemailer"

import { LEGAL } from "@/lib/legal"

/**
 * Campaign mail through Amazon SES (Sydney) from news.krpex.in (E.1). Account email keeps using Spacemail
 * (lib/email/send.ts). SES_SMTP_HOST / SES_SMTP_USER / SES_SMTP_PASSWORD come from the environment; never log them.
 * Optional: EMAIL_CAMPAIGN_FROM (default hello@news.krpex.in) and SES_CONFIGURATION_SET (for SES events).
 */
export function sesConfigured(): boolean {
  return Boolean(process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASSWORD)
}

let transport: Transporter | null = null
function getTransport(): Transporter {
  transport ??= nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST!,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: process.env.SES_SMTP_USER!, pass: process.env.SES_SMTP_PASSWORD! },
    pool: true,
    maxConnections: 2,
    rateDelta: 1000,
    rateLimit: 8, // SES allows more; this keeps a slow, steady pace
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })
  return transport
}

const safeName = (s: string) => s.replace(/[\r\n"<>]/g, "").trim().slice(0, 60) || "Krpex"

/** Sends one campaign email and returns SES's message id (used to match delivery, bounce and complaint events). */
export async function sendCampaignMail(m: {
  to: string
  fromName: string
  subject: string
  text: string
  html: string
  oneClickUrl: string
}): Promise<string> {
  if (!sesConfigured()) throw new Error("SES is not configured")
  const from = process.env.EMAIL_CAMPAIGN_FROM || "hello@news.krpex.in"
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${m.oneClickUrl}>, <mailto:${LEGAL.email}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
  if (process.env.SES_CONFIGURATION_SET) headers["X-SES-CONFIGURATION-SET"] = process.env.SES_CONFIGURATION_SET
  const info = await getTransport().sendMail({
    from: { name: safeName(m.fromName), address: from },
    to: m.to,
    replyTo: LEGAL.email,
    subject: m.subject,
    text: m.text,
    html: m.html,
    headers,
  })
  // SES answers "250 Ok <message id>"; that id is what its events refer to.
  return /^250 Ok (\S+)/.exec(info.response ?? "")?.[1] ?? info.messageId
}
