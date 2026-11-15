"use client"

import { useActionState } from "react"

import {
  campaignSetAction,
  importContactsAction,
  saveCampaignAction,
  testCampaignAction,
  type CampaignFormResult,
  type ImportResult,
} from "@/app/(learn)/admin/email/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { SKIP_LABELS, type SkipReason } from "@/lib/email/contacts-csv"

const note = (ok?: boolean) => (ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground")

/** CSV import (E.2): the file, where these people signed up, how they agreed, tags; then what was kept and skipped. */
export function ImportContactsForm() {
  const [state, action, pending] = useActionState<ImportResult, FormData>(importContactsAction, {})
  const s = state.summary
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="import-file">CSV file</Label>
        <Input id="import-file" name="file" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          In Google Sheets: File → Download → Comma-separated values. Needs a column with “email” in its name; name, college and year are used if
          present. Phone numbers and other columns are ignored.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="import-source">Where they signed up</Label>
          <Input id="import-source" name="source" required maxLength={80} placeholder="30 Days of Code (2023)" />
          <p className="text-xs text-muted-foreground">For your records only; never shown in emails.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="import-tags">Tags</Label>
          <Input id="import-tags" name="tags" maxLength={200} placeholder="30dc-2023" />
          <p className="text-xs text-muted-foreground">Lower-case words, separated by commas. Campaigns are sent to tags.</p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="import-consent">How they agreed to hear from you</Label>
        <Input id="import-consent" name="consent" required maxLength={500} placeholder="Registered on our Google Form for 30 Days of Code, Jan 2023" />
      </div>
      <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
        <input type="checkbox" name="personal_only" defaultChecked className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          Personal addresses only (Gmail, Outlook, Yahoo, iCloud…). Recommended for old lists: college and work addresses are often closed after
          people leave, and bounces hurt delivery.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Checking addresses…" : "Import"}
        </Button>
        {state.message ? <p className={note(state.ok)}>{state.message}</p> : null}
      </div>
      {s ? (
        <div className="rounded-lg border p-4 text-sm" role="status">
          <p className="font-medium">
            {s.rows} rows: {s.added} new contacts, {s.updated} already here (tags added).
          </p>
          {Object.keys(s.skipped).length ? (
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {Object.entries(s.skipped).map(([k, n]) => (
                <li key={k}>
                  {n} skipped: {SKIP_LABELS[k as SkipReason] ?? k}
                </li>
              ))}
            </ul>
          ) : null}
          {s.examples.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-primary">Examples of skipped rows</summary>
              <ul className="mt-2 grid gap-1 text-xs">
                {s.examples.map((e, i) => (
                  <li key={i} className="break-all">
                    {e.email} — {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}

type Draft = { name: string; slug: string; from_name: string; subject: string; preview: string; body: string; tags: string[] }

/** Editing a draft campaign. */
export function CampaignEditor({ id, draft }: { id: string; draft: Draft }) {
  const [state, action, pending] = useActionState<CampaignFormResult, FormData>(saveCampaignAction.bind(null, id), {})
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="c-name">Campaign name (only you see it)</Label>
          <Input id="c-name" name="name" defaultValue={draft.name} required maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-slug">Link name</Label>
          <Input id="c-slug" name="slug" defaultValue={draft.slug} required maxLength={30} pattern="[a-z0-9-]+" />
          <p className="text-xs text-muted-foreground">Krpex links get ?ref=email-{draft.slug || "…"}.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-from">From name</Label>
          <Input id="c-from" name="from_name" defaultValue={draft.from_name} required maxLength={60} />
          <p className="text-xs text-muted-foreground">Sent from hello@news.krpex.in; replies go to info@krpex.in.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-subject">Subject</Label>
          <Input id="c-subject" name="subject" defaultValue={draft.subject} maxLength={150} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-preview">Preview text</Label>
          <Input id="c-preview" name="preview" defaultValue={draft.preview} maxLength={150} placeholder="The grey line next to the subject in the inbox" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-tags">Send to tags</Label>
        <Input id="c-tags" name="tags" defaultValue={draft.tags.join(", ")} maxLength={300} placeholder="Empty = every contact" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-body">Message</Label>
        <Textarea id="c-body" name="body" defaultValue={draft.body} rows={16} maxLength={20000} className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Blank line = new paragraph · <code>{"{{name}}"}</code> = first name · <code>**bold**</code> · <code>[text](https://…)</code> = link ·{" "}
          <code>[[Apply now](https://krpex.in/beta)]</code> alone on a line = button · lines starting <code>- </code> = list · <code># </code> = heading.
          The footer (“You’re getting this because you’re part of the Krpex community” and unsubscribe) is added for you.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          Save
        </Button>
        {state.message ? <p className={note(state.ok)}>{state.message}</p> : null}
      </div>
    </form>
  )
}

export function TestSendButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<CampaignFormResult, FormData>(testCampaignAction.bind(null, id), {})
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Send a test to me"}
      </Button>
      {state.message ? <p className={note(state.ok)}>{state.message}</p> : null}
    </form>
  )
}

const LABELS = { start: "Start sending", pause: "Pause", resume: "Resume", stop: "Stop for good" } as const
const CONFIRM = {
  start: "Start sending this campaign? It goes out in batches within today's limit and can't be edited after this.",
  pause: null,
  resume: "Resume sending? Check bounces and complaints first if it paused itself.",
  stop: "Stop this campaign for good? People who haven't been sent it yet won't get it.",
} as const

export function CampaignControl({ id, action: what, variant = "outline" }: { id: string; action: keyof typeof LABELS; variant?: "default" | "outline" | "destructive" }) {
  const [state, action, pending] = useActionState<CampaignFormResult, FormData>(campaignSetAction.bind(null, id, what), {})
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const q = CONFIRM[what]
        if (q && !window.confirm(q)) e.preventDefault()
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <Button type="submit" variant={variant} disabled={pending}>
        {LABELS[what]}
      </Button>
      {state.message && !state.ok ? <p className={note(false)}>{state.message}</p> : null}
    </form>
  )
}
