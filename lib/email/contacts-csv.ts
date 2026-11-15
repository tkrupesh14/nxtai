/**
 * Contact import (E.2): read a CSV (e.g. a Google Form export), find the email / name / college / year columns
 * and clean the list before anything reaches the database. Pure; the mail-server check is in contacts-mx.ts.
 */
export type ContactRow = { email: string; name: string | null; college: string | null; year: string | null }
export type SkipReason = "invalid" | "duplicate" | "role" | "disposable" | "typo" | "not_personal" | "no_mail_server"
export type Skipped = { email: string; reason: SkipReason }

export const SKIP_LABELS: Record<SkipReason, string> = {
  invalid: "not an email address",
  duplicate: "duplicate in the file",
  role: "shared inbox (info@, admin@…)",
  disposable: "throwaway address",
  typo: "likely typo (e.g. gmial.com)",
  not_personal: "college or work address",
  no_mail_server: "domain has no mail server",
}

const EMAIL = /^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/
const ROLE = /^(admin|administrator|info|support|contact|sales|marketing|hello|help|hr|jobs|careers|office|team|noreply|no-reply|postmaster|webmaster|abuse|billing)@/
const DISPOSABLE = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc", "throwawaymail.com"])
const TYPOS = new Set(["gmial.com", "gamil.com", "gmai.com", "gmal.com", "gmaill.com", "gnail.com", "gmail.co", "gmail.con", "gmail.cm", "gmail.om", "gmail.in", "yaho.com", "yahooo.com", "yahoo.co", "hotmial.com", "hotmai.com", "outlok.com", "outloo.com", "rediffmail.co"])
/** Personal mailbox providers: kept when "personal addresses only" is on (college and work addresses often close). */
export const PERSONAL = new Set(["gmail.com", "googlemail.com", "outlook.com", "outlook.in", "hotmail.com", "live.com", "msn.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "ymail.com", "rocketmail.com", "icloud.com", "me.com", "mac.com", "rediffmail.com", "protonmail.com", "proton.me", "zoho.com", "zohomail.in", "aol.com", "gmx.com", "mail.com"])

/** RFC 4180-ish CSV: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (field += '"'), i++
      else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"' && field === "") quoted = true
    else if (ch === ",") row.push(field), (field = "")
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(field), rows.push(row), (row = []), (field = "")
    } else field += ch
  }
  if (field !== "" || row.length) row.push(field), rows.push(row)
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

/** Which column holds what, from the header row. Email is required. */
export function findColumns(header: string[]) {
  const h = header.map((x) => x.trim().toLowerCase())
  const find = (re: RegExp) => h.findIndex((x) => re.test(x))
  return {
    email: find(/e-?mail/),
    name: find(/^(full\s*|your\s*)?name\b/),
    college: find(/college|university|institute|school|organi[sz]ation/),
    year: find(/\byear\b/),
  }
}

const cell = (r: string[], i: number, max: number) => {
  const v = i >= 0 ? (r[i] ?? "").replace(/\s+/g, " ").trim() : ""
  return v ? v.slice(0, max) : null
}

/** Rows → contacts, with every skipped row and why. The mail-server check comes after (contacts-mx.ts). */
export function cleanContacts(rows: string[][], opts: { personalOnly: boolean }): { contacts: ContactRow[]; skipped: Skipped[]; error?: string } {
  if (rows.length < 2) return { contacts: [], skipped: [], error: "The file has no rows under the header." }
  const col = findColumns(rows[0])
  if (col.email < 0) return { contacts: [], skipped: [], error: "No email column found. The header needs a column with “email” in its name." }
  const seen = new Set<string>()
  const contacts: ContactRow[] = []
  const skipped: Skipped[] = []
  for (const r of rows.slice(1)) {
    const email = (r[col.email] ?? "").trim().toLowerCase().replace(/^mailto:/, "")
    const domain = email.split("@")[1] ?? ""
    const reason: SkipReason | null = !EMAIL.test(email) || email.length > 254
      ? "invalid"
      : seen.has(email)
        ? "duplicate"
        : ROLE.test(email)
          ? "role"
          : DISPOSABLE.has(domain)
            ? "disposable"
            : TYPOS.has(domain)
              ? "typo"
              : opts.personalOnly && !PERSONAL.has(domain)
                ? "not_personal"
                : null
    if (reason) {
      skipped.push({ email: email.slice(0, 120) || "(empty)", reason })
      continue
    }
    seen.add(email)
    contacts.push({ email, name: cell(r, col.name, 80), college: cell(r, col.college, 120), year: cell(r, col.year, 20) })
  }
  return { contacts, skipped }
}

export function countSkipped(skipped: Skipped[]) {
  const counts: Partial<Record<SkipReason, number>> = {}
  for (const s of skipped) counts[s.reason] = (counts[s.reason] ?? 0) + 1
  return counts
}
