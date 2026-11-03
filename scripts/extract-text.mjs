// Extract plain text from an uploaded file. Runs in its own short-lived process (see lib/sources/extract.ts)
// with a memory cap and a timeout, so a huge or malicious file can't take the web server down.
//
// Usage: node --max-old-space-size=384 scripts/extract-text.mjs <pdf|docx|text> <maxPages>  < file
// Prints one JSON line: { pages: [{ page: number | null, text }], totalPages } or { error: "too_many_pages" | "unreadable", totalPages? }

const [kind, maxPagesArg] = process.argv.slice(2)
const maxPages = Number(maxPagesArg) || 300

const chunks = []
for await (const c of process.stdin) chunks.push(c)
const buf = Buffer.concat(chunks)

const decode = (s) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")

/** mammoth's HTML → plain text, keeping headings ("# …") and list items ("- …"). */
function htmlToText(html) {
  return decode(
    html
      .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n\n${"#".repeat(Math.min(Number(n), 3))} `)
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|li|tr|table|ul|ol)>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<img[^>]*>/gi, "")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj))
}

try {
  if (kind === "pdf") {
    const { getDocumentProxy, extractText } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    if (pdf.numPages > maxPages) {
      out({ error: "too_many_pages", totalPages: pdf.numPages })
    } else {
      const { text } = await extractText(pdf, { mergePages: false })
      out({ pages: text.map((t, i) => ({ page: i + 1, text: t })), totalPages: pdf.numPages })
    }
  } else if (kind === "docx") {
    const mammoth = (await import("mammoth")).default
    const { value } = await mammoth.convertToHtml({ buffer: buf })
    out({ pages: [{ page: null, text: htmlToText(value) }], totalPages: null })
  } else {
    out({ pages: [{ page: null, text: buf.toString("utf8").replace(/^﻿/, "") }], totalPages: null })
  }
} catch {
  out({ error: "unreadable" })
}
