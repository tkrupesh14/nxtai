/** The notification email (9.3): subject, plain text and HTML, in the style of the sign-in emails. Pure. */
import { safeLink } from "@/lib/notifications"

export type DigestItem = { id: string; title: string; body: string | null; link: string | null; created_at: string }
export type Digest = { subject: string; text: string; html: string }

const SITE = "https://krpex.in"
const FONT = "'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const MAX_ITEMS = 10

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
/** Keeps a title on one line in the subject and strips anything a mail client could treat as a header. */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim()

export function unsubscribeUrl(token: string, site = SITE) {
  return `${site}/unsubscribe?t=${encodeURIComponent(token)}`
}

export function renderDigest({
  name,
  items,
  token,
  site = SITE,
}: {
  name: string
  items: DigestItem[]
  token: string
  site?: string
}): Digest {
  const shown = items.slice(0, MAX_ITEMS)
  const more = items.length - shown.length
  const subject =
    items.length === 1 ? oneLine(items[0].title).slice(0, 150) : `You have ${items.length} new notifications on Krpex`
  const hello = name.trim() ? `Hi ${oneLine(name).slice(0, 80)},` : "Hi,"
  const intro =
    items.length === 1 ? "Here's something you haven't seen on Krpex yet:" : "Here's what you haven't seen on Krpex yet:"
  const url = (i: DigestItem) => `${site}${safeLink(i.link) ?? "/notifications"}`
  const all = `${site}/notifications`
  const settings = `${site}/account/settings#email`
  const unsub = unsubscribeUrl(token, site)

  const text = [
    hello,
    "",
    intro,
    "",
    ...shown.flatMap((i) => [`• ${oneLine(i.title)}`, ...(i.body ? [`  ${oneLine(i.body)}`] : []), `  ${url(i)}`, ""]),
    ...(more > 0 ? [`…and ${more} more: ${all}`, ""] : []),
    `See all notifications: ${all}`,
    "",
    "—",
    "You get this because you have a Krpex account. We only email notifications you haven't seen in the app.",
    `Email settings: ${settings}`,
    `Turn off these emails: ${unsub}`,
  ].join("\n")

  const rows = shown
    .map(
      (i) => `<tr><td style="padding:14px 0;border-top:1px solid #e7e7ec;" class="rule">
<a href="${esc(url(i))}" target="_blank" class="strong" style="font-family:${FONT};font-size:15px;font-weight:600;color:#18181b;text-decoration:none;">${esc(oneLine(i.title))}</a>
${i.body ? `<p class="body" style="margin:4px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:#3f3f46;">${esc(oneLine(i.body))}</p>` : ""}
</td></tr>`,
    )
    .join("\n")

  const html = `<!doctype html>
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
    .rule { border-color:#27272a !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:#f5f6f8;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#f5f6f8;">
<tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
  <a href="${site}" target="_blank" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="26" height="26" bgcolor="#2563eb" style="width:26px;height:26px;border-radius:7px;background:#2563eb;background-image:linear-gradient(135deg,#3b82f6,#1d4ed8);font-size:0;line-height:0;">&nbsp;</td>
    <td class="brand" style="padding-left:10px;font-family:${FONT};font-size:19px;font-weight:600;letter-spacing:-.02em;color:#18181b;">Krpex</td>
  </tr></table></a>
</td></tr>
<tr><td class="card" style="background:#ffffff;border:1px solid #e7e7ec;border-radius:16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="card-pad" style="padding:32px 36px;">
    <p class="body" style="margin:0 0 6px;font-family:${FONT};font-size:15px;line-height:1.6;color:#3f3f46;">${esc(hello)}</p>
    <p class="body" style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.6;color:#3f3f46;">${esc(intro)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
    </table>
    ${more > 0 ? `<p class="muted" style="margin:8px 0 0;font-family:${FONT};font-size:14px;color:#71717a;">…and ${more} more.</p>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
      <td style="border-radius:10px;background:#2563eb;"><a href="${all}" target="_blank" style="display:inline-block;padding:11px 20px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">See all notifications &rarr;</a></td>
    </tr></table>
  </td></tr></table>
</td></tr>
<tr><td style="padding:20px 4px 0;">
  <p class="muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:#71717a;">You get this because you have a Krpex account. We only email notifications you haven't seen in the app.
  <a href="${settings}" target="_blank" style="color:#71717a;">Email settings</a> &middot; <a href="${esc(unsub)}" target="_blank" style="color:#71717a;">Turn off these emails</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  return { subject, text, html }
}
