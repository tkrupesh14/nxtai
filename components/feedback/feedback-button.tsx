"use client"

import { useEffect, useId, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { Button } from "@/components/site/ui/button"
import { Textarea } from "@/components/site/ui/textarea"
import { sendFeedback } from "@/lib/feedback/actions"
import { FEEDBACK_BUCKET, FEEDBACK_KINDS, MAX_SCREENSHOT_BYTES, SCREENSHOT_TYPES, type FeedbackKind, type FeedbackSite } from "@/lib/feedback/options"
import { mainHref } from "@/lib/code-host"
import { recentErrors } from "@/lib/recent-errors"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Phase = { name: "idle" } | { name: "sending" } | { name: "sent" } | { name: "error"; message: string }

/**
 * The Feedback button (closed beta B.2) at the bottom left of every page on krpex.in, Code and Community, for
 * signed-in accounts (not on /admin). A screenshot goes straight from the browser to the tester's own folder in
 * the private "feedback" bucket; the report itself is saved by sendFeedback with the page, screen size and recent errors.
 */
export function FeedbackButton({ site }: { site: FeedbackSite }) {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>("bug")
  const [body, setBody] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>({ name: "idle" })
  const fileInput = useRef<HTMLInputElement>(null)
  const id = useId()

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
    const { data } = supabase.auth.onAuthStateChange((_, session) => setUserId(session?.user.id ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!userId || pathname.startsWith("/admin")) return null

  const pick = (f: File | null | undefined) => {
    setFileError(null)
    if (!f) return setFile(null)
    if (!SCREENSHOT_TYPES[f.type]) return setFileError("Choose a PNG, JPEG or WebP image.")
    if (f.size > MAX_SCREENSHOT_BYTES) return setFileError("That image is over 5 MB.")
    setFile(f)
  }

  const reset = () => {
    setKind("bug")
    setBody("")
    setFile(null)
    setFileError(null)
    setPhase({ name: "idle" })
    if (fileInput.current) fileInput.current.value = ""
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (body.trim().length < 3) return setPhase({ name: "error", message: "Tell us a little about it first." })
    setPhase({ name: "sending" })
    let screenshot: string | null = null
    if (file) {
      const name = `${userId}/${crypto.randomUUID()}.${SCREENSHOT_TYPES[file.type]}`
      const { error } = await createClient().storage.from(FEEDBACK_BUCKET).upload(name, file, { contentType: file.type, upsert: false })
      if (error) {
        console.warn("feedback screenshot upload failed:", error.message)
        return setPhase({ name: "error", message: "The screenshot didn't upload. Try again, or remove it and send without one." })
      }
      screenshot = name
    }
    const res = await sendFeedback({
      kind,
      body,
      site,
      path: location.pathname + location.search,
      screenshot,
      context: {
        screen: `${screen.width}×${screen.height}`,
        viewport: `${innerWidth}×${innerHeight}`,
        language: navigator.language,
        errors: recentErrors(),
      },
    }).catch(() => ({ ok: false as const, message: "Couldn't send that. Check your connection and try again." }))
    setPhase(res.ok ? { name: "sent" } : { name: "error", message: res.message })
  }

  const prompt = FEEDBACK_KINDS.find((k) => k.id === kind)!.prompt
  const mine = mainHref("/account/feedback", typeof window === "undefined" ? null : location.host)

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-lg transition-transform hover:-translate-y-0.5 print:hidden"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4 text-primary" aria-hidden>
            <path d="M4 4.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          </svg>
          Feedback
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} aria-hidden />
          <section
            role="dialog"
            aria-labelledby={`${id}-title`}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border bg-background p-4 shadow-2xl md:inset-x-auto md:bottom-4 md:left-4 md:w-[380px] md:rounded-xl"
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`${id}-title`} className="font-semibold">
                  Send feedback
                </h2>
                <p className="text-xs text-muted-foreground">We read every report. Thanks for helping us build Krpex.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {phase.name === "sent" ? (
              <div className="mt-4 grid gap-3 text-sm" role="status">
                <p className="font-medium">Thanks, we got it.</p>
                <p className="text-muted-foreground">
                  You&apos;ll get a notification when we reply. You can follow it on{" "}
                  <a href={mine} className="text-primary hover:underline">
                    your feedback page
                  </a>
                  .
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={reset}>
                    Send more
                  </Button>
                  <Button type="button" size="sm" onClick={() => (setOpen(false), reset())}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={submit}
                onPaste={(e) => {
                  const f = Array.from(e.clipboardData.files).find((x) => x.type.startsWith("image/"))
                  if (f) pick(f)
                }}
                className="mt-4 grid gap-4"
              >
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-medium">What is it about?</legend>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_KINDS.map((k) => (
                      <label
                        key={k.id}
                        className={cn(
                          "cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                          kind === k.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
                        {k.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-2">
                  <label htmlFor={`${id}-body`} className="text-sm font-medium">
                    {prompt}
                  </label>
                  <Textarea id={`${id}-body`} value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={4000} required autoFocus />
                </div>
                <div className="grid gap-2 text-sm">
                  <span className="font-medium">
                    Screenshot <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  {preview ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Your screenshot" className="h-16 max-w-28 rounded border object-cover" />
                      <button type="button" onClick={() => pick(null)} className="text-sm text-primary hover:underline">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Add a screenshot"
                      onChange={(e) => pick(e.target.files?.[0])}
                      className="text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1 file:text-sm"
                    />
                  )}
                  {fileError && <p className="text-xs text-destructive-foreground">{fileError}</p>}
                  <p className="text-xs text-muted-foreground">PNG, JPEG or WebP up to 5 MB. On a computer you can also paste one here.</p>
                </div>
                <p className="text-xs text-muted-foreground">We also send this page&apos;s address, your browser and screen size, and any errors on this page.</p>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {phase.name === "error" && (
                    <p role="alert" className="text-sm text-destructive-foreground">
                      {phase.message}
                    </p>
                  )}
                  <Button type="submit" size="sm" disabled={phase.name === "sending"} loading={phase.name === "sending"}>
                    {phase.name === "sending" ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </>
  )
}
