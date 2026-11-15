"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { renderCampaign } from "@/lib/email/campaign"
import { cleanContacts, countSkipped, parseCsv, SKIP_LABELS, type Skipped } from "@/lib/email/contacts-csv"
import { domainsWithoutMail } from "@/lib/email/contacts-mx"
import { sendCampaignMail, sesConfigured } from "@/lib/email/ses"
import { createClient } from "@/lib/supabase/server"

// Email campaigns (E.2–E.5). Every RPC below checks require_admin in the database as well.

export type ImportResult = {
  ok?: boolean
  message?: string
  summary?: { rows: number; added: number; updated: number; skipped: Record<string, number>; examples: { email: string; reason: string }[] }
}
export type CampaignFormResult = { ok?: boolean; message?: string }

const tagsOf = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
const slugOf = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "")

export async function importContactsAction(_: ImportResult, formData: FormData): Promise<ImportResult> {
  const file = formData.get("file")
  const source = String(formData.get("source") ?? "").trim().slice(0, 80)
  const consent = String(formData.get("consent") ?? "").trim().slice(0, 500)
  const tags = tagsOf(formData.get("tags"))
  const personalOnly = formData.get("personal_only") === "on"
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a CSV file." }
  if (file.size > 2_000_000) return { message: "That file is over 2 MB. Split it into smaller files." }
  if (!source) return { message: "Say where these people signed up (for your records)." }
  if (!consent) return { message: "Note how they agreed to hear from you (kept with the import)." }

  const rows = parseCsv(await file.text())
  if (rows.length > 10_001) return { message: "That file has over 10,000 rows. Split it into smaller files." }
  const cleaned = cleanContacts(rows, { personalOnly })
  if (cleaned.error) return { message: cleaned.error }

  const noMail = await domainsWithoutMail(cleaned.contacts.map((c) => c.email.split("@")[1]))
  const skipped: Skipped[] = [...cleaned.skipped]
  const contacts = cleaned.contacts.filter((c) => {
    if (!noMail.has(c.email.split("@")[1])) return true
    skipped.push({ email: c.email, reason: "no_mail_server" })
    return false
  })
  const counts = countSkipped(skipped)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_email_import", {
    p_source: source,
    p_consent: consent,
    p_file: file.name.slice(0, 200),
    p_tags: tags,
    p_rows: contacts,
    p_skipped: counts,
  })
  if (error) {
    console.error("admin_email_import failed:", error.message)
    return { message: "Couldn't save the contacts. Are you signed in as an admin?" }
  }
  revalidatePath("/admin/email", "layout")
  const r = data as { added: number; updated: number; invalid: number }
  return {
    ok: true,
    summary: {
      rows: rows.length - 1,
      added: r.added,
      updated: r.updated,
      skipped: counts,
      examples: skipped.slice(0, 15).map((s) => ({ email: s.email, reason: SKIP_LABELS[s.reason] })),
    },
  }
}

export async function createCampaignAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  if (!name) return
  const supabase = await createClient()
  let slug = slugOf(name) || "campaign"
  for (let i = 2; i < 20; i++) {
    const { data, error } = await supabase.rpc("admin_email_campaign_save", {
      p_id: null,
      p_name: name,
      p_slug: slug,
      p_subject: "",
      p_preview: "",
      p_body: "",
      p_from_name: "Krpex",
      p_tags: [],
    })
    if (!error) redirect(`/admin/email/${data}`)
    if (!/slug taken/.test(error.message)) {
      console.error("admin_email_campaign_save failed:", error.message)
      return
    }
    slug = `${slugOf(name).slice(0, 26)}-${i}`
  }
}

export async function saveCampaignAction(id: string, _: CampaignFormResult, formData: FormData): Promise<CampaignFormResult> {
  const slug = slugOf(String(formData.get("slug") ?? ""))
  if (!slug) return { message: "The link name needs letters or digits." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_email_campaign_save", {
    p_id: id,
    p_name: String(formData.get("name") ?? ""),
    p_slug: slug,
    p_subject: String(formData.get("subject") ?? ""),
    p_preview: String(formData.get("preview") ?? ""),
    p_body: String(formData.get("body") ?? ""),
    p_from_name: String(formData.get("from_name") ?? ""),
    p_tags: tagsOf(formData.get("tags")),
  })
  if (error) {
    console.error("admin_email_campaign_save failed:", error.message)
    if (/slug taken/.test(error.message)) return { message: "Another campaign already uses that link name." }
    if (/not a draft/.test(error.message)) return { message: "This campaign has started, so it can't be changed." }
    return { message: "Couldn't save. Are you signed in as an admin?" }
  }
  revalidatePath(`/admin/email/${id}`)
  return { ok: true, message: "Saved." }
}

/** Sends the saved draft to the signed-in admin only, without tracking. */
export async function testCampaignAction(id: string, _: CampaignFormResult): Promise<CampaignFormResult> {
  if (!sesConfigured()) return { message: "SES isn't set up on this server." }
  const supabase = await createClient()
  const [{ data: user }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("admin_email_campaign", { p_id: id, p_filter: "all", p_limit: 1, p_offset: 0 }),
  ])
  const to = user.user?.email
  const c = (data as { campaign?: { subject: string; preview: string; body: string; from_name: string; slug: string } } | null)?.campaign
  if (error || !c || !to) return { message: "Couldn't load the campaign. Are you signed in as an admin?" }
  if (!c.subject.trim() || !c.body.trim()) return { message: "Add a subject and a message, and save, first." }
  const meta = user.user?.user_metadata as { full_name?: string; name?: string } | undefined
  const mail = renderCampaign(c, { name: meta?.full_name ?? meta?.name ?? null, token: null })
  try {
    await sendCampaignMail({ to, fromName: c.from_name, ...mail, subject: `[Test] ${mail.subject}` })
  } catch (e) {
    console.error("test campaign email failed:", e instanceof Error ? e.message.replace(/\S+@\S+/g, "<address>") : e)
    return { message: "SES refused the email. Check the server log." }
  }
  return { ok: true, message: `Sent to ${to}. Links in test emails aren't tracked.` }
}

const SET_MESSAGES: Record<string, string> = {
  empty: "Nobody to send to: no contacts with those tags (or they're all on the do-not-send list).",
  incomplete: "Add a subject and a message, and save, first.",
  bad_state: "That can't be done in the campaign's current state. Reload the page.",
}

export async function campaignSetAction(id: string, action: "start" | "pause" | "resume" | "stop", _: CampaignFormResult): Promise<CampaignFormResult> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_email_campaign_set", { p_id: id, p_action: action })
  if (error) {
    console.error("admin_email_campaign_set failed:", error.message)
    return { message: "Couldn't do that. Are you signed in as an admin?" }
  }
  if (data !== "ok") return { message: SET_MESSAGES[String(data)] ?? "Couldn't do that." }
  revalidatePath("/admin/email", "layout")
  return { ok: true }
}
