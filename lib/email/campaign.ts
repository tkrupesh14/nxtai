/**
 * Campaign emails (E.3): a small Markdown subset → the Krpex email layout, with tracked links and an open
 * image. Pure: the caller passes how to wrap links (signed click URLs on the server, nothing for test sends).
 *
 * Markdown: blank lines separate paragraphs; "# " is a heading; lines starting "- " are a list;
 * [text](https://…) is a link; a paragraph that is only [[text](https://…)] is a button; **bold**;
 * {{name}} is the first name ("there" when unknown).
 */
import { LEGAL } from "@/lib/legal"

export type CampaignContent = { subject: string; preview: string; body: string; from_name: string; slug: string }
export type RenderOptions = {
  name?: string | null
  /** Per-recipient token; null for a test send (no tracking). */
  token: string | null
  /** Wraps a link for click tracking. Only called when there is a token. */
  trackLink?: (url: string) => string
  site?: string
}
export type RenderedEmail = { subject: string; text: string; html: string; unsubscribeUrl: string; oneClickUrl: string }

const SITE = "https://krpex.in"
const FONT = "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*/g

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim()

export function firstName(name: string | null | undefined) {
  const first = oneLine(name ?? "").split(" ")[0] ?? ""
  return first ? first.charAt(0).toUpperCase() + first.slice(1).slice(0, 40) : "there"
}

/** Krpex links get ?ref=email-<slug> (so sign-ups and beta applications are counted); others are left alone. */
export function withRef(url: string, slug: string) {
  try {
    const u = new URL(url)
    if (!/(^|\.)krpex\.in$/.test(u.hostname) || u.searchParams.has("ref")) return url
    u.searchParams.set("ref", `email-${slug}`)
    return u.toString()
  } catch {
    return url
  }
}

/** Paragraphs split on blank lines; inside one, a heading line and a run of list lines are blocks of their own. */
export function splitBlocks(body: string): string[] {
  const out: string[] = []
  for (const para of body.trim().split(/\n\s*\n/)) {
    let kind = ""
    for (const raw of para.split("\n")) {
      const line = raw.trimEnd()
      if (!line.trim()) continue
      const k = /^#{1,3} /.test(line) ? "h" : /^[-*] /.test(line) ? "l" : "p"
      if (k === "h" || k !== kind || out.length === 0) out.push(line)
      else out[out.length - 1] += `\n${line}`
      kind = k === "h" ? "" : k
    }
    out.push("")
  }
  return out.filter(Boolean).map((b) => b.trim())
}

export function renderCampaign(c: CampaignContent, o: RenderOptions): RenderedEmail {
  const site = o.site ?? SITE
  const fill = (s: string) => s.replace(/\{\{\s*name\s*\}\}/g, firstName(o.name))
  const href = (url: string) => {
    const u = withRef(url, c.slug)
    return o.token && o.trackLink ? o.trackLink(u) : u
  }
  const unsubscribeUrl = `${site}/email/unsubscribe${o.token ? `?t=${o.token}` : ""}`
  const oneClickUrl = `${site}/api/email/u${o.token ? `?t=${o.token}` : ""}`

  const inlineHtml = (raw: string) => {
    let out = ""
    let last = 0
    for (const m of raw.matchAll(LINK)) {
      out += esc(raw.slice(last, m.index))
      out += m[1]
        ? `<a href="${esc(href(m[2]))}" target="_blank" style="color:#2563eb;">${esc(m[1])}</a>`
        : `<strong>${esc(m[3])}</strong>`
      last = m.index! + m[0].length
    }
    return out + esc(raw.slice(last))
  }
  const inlineText = (raw: string) => raw.replace(LINK, (_, t, u, b) => (t ? `${t} (${withRef(u, c.slug)})` : b))

  const blocks = splitBlocks(fill(c.body.replace(/\r\n?/g, "\n")))
  const p = `margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;color:#3f3f46;`
  const html = blocks
    .map((b) => {
      const button = b.match(/^\[\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)\]$/)
      if (button)
        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td style="border-radius:10px;background:#2563eb;"><a href="${esc(href(button[2]))}" target="_blank" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${esc(button[1])}</a></td></tr></table>`
      if (/^#{1,3} /.test(b))
        return `<h2 class="strong" style="margin:4px 0 12px;font-family:${FONT};font-size:19px;line-height:1.35;font-weight:600;color:#18181b;">${inlineHtml(oneLine(b.replace(/^#{1,3} /, "")))}</h2>`
      const lines = b.split("\n")
      if (lines.every((l) => /^[-*] /.test(l)))
        return `<ul class="body" style="margin:0 0 16px;padding-left:20px;font-family:${FONT};font-size:15px;line-height:1.65;color:#3f3f46;">${lines.map((l) => `<li style="margin:0 0 6px;">${inlineHtml(l.slice(2))}</li>`).join("")}</ul>`
      return `<p class="body" style="${p}">${lines.map(inlineHtml).join("<br>")}</p>`
    })
    .join("\n")

  const subject = oneLine(fill(c.subject)).slice(0, 150)
  const preview = oneLine(fill(c.preview))
  // The same for everyone: contacts come from several lists, and where someone signed up stays in admin only.
  const why = "You're getting this because you're part of the Krpex community."
  const address = [LEGAL.operator, LEGAL.address].filter(Boolean).join(", ")

  const text = [
    ...blocks.map((b) => {
      const button = b.match(/^\[\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)\]$/)
      if (button) return `${button[1]}: ${withRef(button[2], c.slug)}`
      return inlineText(b.replace(/^#{1,3} /, ""))
    }),
    "—",
    why,
    `Unsubscribe: ${unsubscribeUrl}`,
    ...(address ? [address] : []),
  ].join("\n\n")

  const pixel = o.token ? `<img src="${site}/api/email/o/${o.token}" width="1" height="1" alt="" style="width:1px;height:1px;border:0;">` : ""
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<style>
  body { margin:0; padding:0; }
  a { color:#2563eb; }
  @media (max-width:600px) { .card-pad { padding:28px 22px !important; } }
  @media (prefers-color-scheme: dark) {
    .bg { background:#09090b !important; }
    .card { background:#141417 !important; border-color:#27272a !important; }
    .strong, .brand { color:#fafafa !important; }
    .body { color:#d4d4d8 !important; }
    .muted { color:#a1a1aa !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f5f6f8;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#f5f6f8;">
<tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
  <a href="${esc(href(site))}" target="_blank" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="26" height="26" bgcolor="#2563eb" style="width:26px;height:26px;border-radius:7px;background:#2563eb;background-image:linear-gradient(135deg,#3b82f6,#1d4ed8);font-size:0;line-height:0;">&nbsp;</td>
    <td class="brand" style="padding-left:10px;font-family:${FONT};font-size:19px;font-weight:600;letter-spacing:-.02em;color:#18181b;">Krpex</td>
  </tr></table></a>
</td></tr>
<tr><td class="card" style="background:#ffffff;border:1px solid #e7e7ec;border-radius:16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="card-pad" style="padding:32px 36px 16px;">
${html}
  </td></tr></table>
</td></tr>
<tr><td style="padding:20px 4px 0;">
  <p class="muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:#71717a;">${esc(why)}
  <a href="${esc(unsubscribeUrl)}" target="_blank" style="color:#71717a;">Unsubscribe</a>${address ? `<br>${esc(address)}` : ""}</p>
  ${pixel}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { subject, text, html: page, unsubscribeUrl, oneClickUrl }
}
