import { headers } from "next/headers"

import { AccountSection } from "@/components/learn/account-section"
import { Pill } from "@/components/admin/ui"
import { FEEDBACK_BUCKET, feedbackPageHref, kindLabel, siteLabel, statusLabel, type FeedbackRow } from "@/lib/feedback/options"
import { requestHost } from "@/lib/code-host"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/supabase/profile"

export const metadata = { title: "Feedback — Krpex" }

const date = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
const TONE = { new: "muted", planned: "primary", in_progress: "warn", fixed: "primary", wont_fix: "muted" } as const

/** The signed-in account's feedback (closed beta B.2): what they sent, where, its status and Krpex's reply. */
export default async function MyFeedbackPage() {
  await getCurrentProfile()
  const supabase = await createClient()
  const host = requestHost(await headers())
  const { data, error } = await supabase.rpc("feedback_mine", { p_limit: 100, p_offset: 0 })
  if (error) console.error("feedback_mine failed:", error.message)
  const rows = (data ?? []) as FeedbackRow[]
  const paths = rows.flatMap((r) => (r.screenshot ? [r.screenshot] : []))
  const shots = new Map<string, string>()
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrls(paths, 600)
    for (const s of signed ?? []) if (s.path && s.signedUrl) shots.set(s.path, s.signedUrl)
  }

  return (
    <AccountSection
      title="Your feedback"
      description="Bugs, ideas and confusing bits you've sent with the Feedback button at the bottom of every page. We reply here and send you a notification."
    >
      {error ? <p className="text-sm text-destructive-foreground">Couldn&apos;t load your feedback. Please refresh.</p> : null}
      {!error && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet. Spotted something? Tap Feedback at the bottom left of any page.</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm" aria-label="Your feedback">
          {rows.map((r) => (
            <li key={r.id} className="grid gap-2 px-4 py-3">
              <p className="flex flex-wrap items-center gap-1.5">
                <Pill>{kindLabel(r.kind)}</Pill>
                <Pill tone={TONE[r.status]}>{statusLabel(r.status)}</Pill>
                <span className="text-xs text-muted-foreground">
                  {date(r.created_at)} · {siteLabel(r.site)}{" "}
                  <a href={feedbackPageHref(r.site, r.path, host)} className="break-all hover:underline">
                    {r.path}
                  </a>
                </span>
              </p>
              <p className="whitespace-pre-line break-words">{r.body}</p>
              {r.screenshot && shots.get(r.screenshot) ? (
                <a href={shots.get(r.screenshot)} target="_blank" rel="noreferrer" className="justify-self-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shots.get(r.screenshot)} alt="Your screenshot" className="h-20 max-w-40 rounded border object-cover" />
                </a>
              ) : null}
              {r.reply ? (
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Krpex replied{r.replied_at ? ` on ${date(r.replied_at)}` : ""}</p>
                  <p className="mt-1 whitespace-pre-line break-words">{r.reply}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AccountSection>
  )
}
