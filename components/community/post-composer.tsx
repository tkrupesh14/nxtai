"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { savePostAction } from "@/app/(community)/community/actions"
import { Markdown } from "@/components/community/markdown"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { LIMITS, type PostKind } from "@/lib/community/posts"
import { cn } from "@/lib/utils"

type Draft = { title: string; body: string; code: string; language: "python" | "javascript"; spoiler: boolean }

/** New post or edit: title, Markdown body with a preview, optional code (required for solutions), spoiler flag. */
export function PostComposer({
  kind,
  space,
  threadBase,
  cancelHref,
  initial,
  editId,
}: {
  kind: PostKind
  space: string
  /** Where the post will live, without its id ("/p/two-sum/solutions/"). */
  threadBase: string
  cancelHref: string
  initial: Draft
  editId?: string
}) {
  const router = useRouter()
  const [d, setD] = useState<Draft>(initial)
  const [tab, setTab] = useState<"write" | "preview">("write")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const solution = kind === "solution"
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const field = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        start(async () => {
          const r = await savePostAction({ id: editId, space, kind, title: d.title, body: d.body, code: d.code || null, language: d.code.trim() ? d.language : null, spoiler: d.spoiler })
          if (r.error || !r.id) setError(r.error ?? "Couldn't save. Please try again.")
          else {
            router.push(`${threadBase}${r.id}`)
            router.refresh()
          }
        })
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={d.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={LIMITS.title}
          required
          minLength={3}
          placeholder={solution ? "One pass with a hash map · O(n)" : "Why does my loop miss the last element?"}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="body">{solution ? "Explain your approach (optional)" : "Your question or idea"}</Label>
          <div role="tablist" aria-label="Editor" className="flex rounded-md border p-0.5 text-xs">
            {(["write", "preview"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded px-2.5 py-1 capitalize", tab === t ? "bg-muted font-medium" : "text-muted-foreground")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {tab === "write" ? (
          <textarea
            id="body"
            value={d.body}
            onChange={(e) => set("body", e.target.value)}
            maxLength={LIMITS.body}
            rows={8}
            required={!solution}
            placeholder={solution ? "The idea, why it works, and its time and space cost. Markdown works." : "What you tried and where you're stuck. Markdown works; use ``` for code."}
            className={field}
          />
        ) : (
          <div className="min-h-40 rounded-md border px-4 py-3">{d.body.trim() ? <Markdown>{d.body}</Markdown> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}</div>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="code">{solution ? "Your code" : "Code (optional)"}</Label>
          <select
            aria-label="Language"
            value={d.language}
            onChange={(e) => set("language", e.target.value as Draft["language"])}
            className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
        <textarea
          id="code"
          value={d.code}
          onChange={(e) => set("code", e.target.value)}
          maxLength={LIMITS.code}
          rows={solution ? 12 : 6}
          required={solution}
          spellCheck={false}
          autoCapitalize="none"
          className={cn(field, "font-mono text-[13px] leading-relaxed")}
        />
      </div>

      {!solution && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={d.spoiler} onChange={(e) => set("spoiler", e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
          <span>
            Contains a spoiler
            <span className="block text-xs text-muted-foreground">Hidden until the reader taps to show it. Full solutions belong under Solutions.</span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} loading={pending}>
          {pending ? "Posting…" : editId ? "Save changes" : solution ? "Share solution" : "Post"}
        </Button>
        <a href={cancelHref} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </a>
        <p className="ml-auto text-xs text-muted-foreground">Be kind, and follow the community guidelines.</p>
      </div>
    </form>
  )
}
