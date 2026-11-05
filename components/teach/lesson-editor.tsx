"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { saveModelLesson } from "@/app/(learn)/teach/actions"
import { LessonBlockView, Md } from "@/components/learn/lesson-blocks"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import type { Professor } from "@/lib/learning/catalog"
import {
  BLOCK_INFO,
  EDITOR_BLOCK_TYPES,
  emptyBlock,
  firstProblem,
  MAX_BLOCKS,
  toLessonBlocks,
  type EditorBlock,
  type EditorBlockType,
  type ModelLesson,
} from "@/lib/teach/lessons"
import { TEACH_LANGUAGES } from "@/lib/teach/subjects"
import { cn } from "@/lib/utils"

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean)
const LETTERS = ["A", "B", "C", "D"]

export function LessonEditor({ id, initial, professorName }: { id: string | null; initial: ModelLesson; professorName: string }) {
  const router = useRouter()
  const [lesson, setLesson] = useState<ModelLesson>(initial)
  // Items and takeaways are edited as text, so blank lines survive while typing.
  const [itemText, setItemText] = useState<string[]>(() => initial.blocks.map((b) => b.items.join("\n")))
  const [takeaways, setTakeaways] = useState(initial.key_takeaways.join("\n"))
  const [mode, setMode] = useState<"edit" | "preview">("edit")
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [addType, setAddType] = useState<EditorBlockType>("explanation")
  const [saving, startSave] = useTransition()

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const current = (): ModelLesson => ({
    ...lesson,
    blocks: lesson.blocks.map((b, i) => ({ ...b, items: lines(itemText[i] ?? "") })),
    key_takeaways: lines(takeaways),
  })

  function change(update: (l: ModelLesson) => ModelLesson) {
    setLesson(update)
    setDirty(true)
    setMessage(null)
  }
  const setBlock = (i: number, patch: Partial<EditorBlock>) =>
    change((l) => ({ ...l, blocks: l.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }))
  const setCheckpoint = (i: number, patch: Partial<NonNullable<EditorBlock["checkpoint"]>>) =>
    change((l) => ({ ...l, blocks: l.blocks.map((b, j) => (j === i && b.checkpoint ? { ...b, checkpoint: { ...b.checkpoint, ...patch } } : b)) }))

  function move(i: number, by: -1 | 1) {
    const j = i + by
    if (j < 0 || j >= lesson.blocks.length) return
    const swap = <T,>(arr: T[]) => {
      const a = [...arr]
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    }
    change((l) => ({ ...l, blocks: swap(l.blocks) }))
    setItemText(swap)
  }
  function remove(i: number) {
    if (!window.confirm(`Remove block ${i + 1} (${BLOCK_INFO[lesson.blocks[i].type].label})?`)) return
    change((l) => ({ ...l, blocks: l.blocks.filter((_, j) => j !== i) }))
    setItemText((t) => t.filter((_, j) => j !== i))
  }
  function add() {
    if (lesson.blocks.length >= MAX_BLOCKS) return
    change((l) => ({ ...l, blocks: [...l.blocks, emptyBlock(addType)] }))
    setItemText((t) => [...t, ""])
  }

  function save() {
    const l = current()
    const problem = firstProblem(l)
    if (problem) return setMessage({ ok: false, text: problem })
    startSave(async () => {
      const r = await saveModelLesson(id, l)
      if (!r.ok) return setMessage({ ok: false, text: r.message ?? "We couldn't save the lesson." })
      setDirty(false)
      setMessage({ ok: true, text: "Saved." })
      if (!id && r.id) router.replace(`/teach/lessons/${r.id}`)
      else router.refresh()
    })
  }

  const persona: Professor = {
    id: "preview",
    name: professorName,
    title: "AI professor",
    bio: "",
    style: "",
    initials: professorName.replace(/^(dr|prof)\.?\s+/i, "").slice(0, 1).toUpperCase() || "P",
    avatarClass: "bg-primary text-primary-foreground",
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-1" role="tablist" aria-label="Editor mode">
          {(["edit", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-md px-3 py-1.5 text-sm", mode === m ? "bg-muted font-medium" : "text-muted-foreground")}
            >
              {m === "edit" ? "Edit" : "Preview"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Markdown: **bold**, lists, `code`. Maths between double dollars: $$F = ma$$
        </p>
      </div>

      {mode === "preview" ? (
        <div className="grid min-w-0 gap-6" aria-label="Lesson preview">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{lesson.title || "Untitled lesson"}</h2>
            {lesson.objective ? <p className="mt-1 text-muted-foreground">{lesson.objective}</p> : null}
          </div>
          {toLessonBlocks(current().blocks).map((b, i) => (
            <LessonBlockView key={i} block={b} id={`preview-${i}`} professor={persona} />
          ))}
          {lines(takeaways).length ? (
            <aside className="rounded-xl border bg-muted/40 p-5">
              <h3 className="mb-2 font-semibold">Key takeaways</h3>
              <ul className="grid list-disc gap-1 pl-5">
                {lines(takeaways).map((t, i) => (
                  <li key={i}>
                    <Md compact>{t}</Md>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      ) : (
        <>
          <section className="grid gap-4 rounded-xl border bg-card p-5">
            <div className="grid gap-2">
              <Label htmlFor="l-title">Lesson title</Label>
              <Input id="l-title" value={lesson.title} maxLength={200} onChange={(e) => change((l) => ({ ...l, title: e.target.value }))} placeholder="Newton's second law" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="l-topic">Topic</Label>
                <Input id="l-topic" value={lesson.topic} maxLength={120} onChange={(e) => change((l) => ({ ...l, topic: e.target.value }))} placeholder="Mechanics" />
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">Language</legend>
                <div className="flex flex-wrap gap-4">
                  {TEACH_LANGUAGES.map((lang) => (
                    <label key={lang.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="lesson-language"
                        checked={lesson.language === lang.id}
                        onChange={() => change((l) => ({ ...l, language: lang.id }))}
                        className="size-4"
                      />
                      {lang.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="l-objective">What the learner should be able to do afterwards</Label>
              <Input id="l-objective" value={lesson.objective} maxLength={500} onChange={(e) => change((l) => ({ ...l, objective: e.target.value }))} />
            </div>
          </section>

          <ol className="grid min-w-0 gap-4" aria-label="Lesson blocks">
            {lesson.blocks.map((b, i) => {
              const info = BLOCK_INFO[b.type]
              const name = `Block ${i + 1} (${info.label})`
              return (
                <li key={i} className="grid min-w-0 gap-3 rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {i + 1}. {info.label}
                      <span className="ml-2 font-normal text-muted-foreground">{info.hint}</span>
                    </p>
                    <div className="flex gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${name} up`}>
                        ↑
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === lesson.blocks.length - 1} aria-label={`Move ${name} down`}>
                        ↓
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)} aria-label={`Remove ${name}`}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <Input value={b.title} maxLength={200} onChange={(e) => setBlock(i, { title: e.target.value })} placeholder="Heading (optional)" aria-label={`${name} heading`} />
                  <Textarea
                    value={b.body_markdown}
                    maxLength={20000}
                    rows={b.type === "checkpoint" ? 2 : 5}
                    onChange={(e) => setBlock(i, { body_markdown: e.target.value })}
                    placeholder={b.type === "checkpoint" ? "A line before the question (optional)" : "Write as you'd say it in class"}
                    aria-label={`${name} text`}
                  />
                  {info.items ? (
                    <Textarea
                      value={itemText[i] ?? ""}
                      rows={3}
                      onChange={(e) => {
                        const v = e.target.value
                        setItemText((t) => t.map((x, j) => (j === i ? v : x)))
                        setDirty(true)
                      }}
                      placeholder={info.items}
                      aria-label={`${name} list`}
                    />
                  ) : null}
                  {b.checkpoint ? (
                    <fieldset className="grid gap-2">
                      <legend className="sr-only">{name} question</legend>
                      <Input value={b.checkpoint.question} maxLength={1000} onChange={(e) => setCheckpoint(i, { question: e.target.value })} placeholder="Question" aria-label={`${name} question`} />
                      {b.checkpoint.options.map((o, k) => (
                        <div key={k} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`answer-${i}`}
                            checked={b.checkpoint!.answer_index === k}
                            onChange={() => setCheckpoint(i, { answer_index: k })}
                            className="size-4"
                            aria-label={`${name}: option ${LETTERS[k]} is correct`}
                          />
                          <Input
                            value={o}
                            maxLength={500}
                            onChange={(e) => setCheckpoint(i, { options: b.checkpoint!.options.map((x, n) => (n === k ? e.target.value : x)) })}
                            placeholder={`Option ${LETTERS[k]}`}
                            aria-label={`${name} option ${LETTERS[k]}`}
                          />
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">Select the correct option with the circle on its left.</p>
                      <Textarea value={b.checkpoint.explanation} maxLength={1500} rows={2} onChange={(e) => setCheckpoint(i, { explanation: e.target.value })} placeholder="Why the answer is right" aria-label={`${name} explanation`} />
                    </fieldset>
                  ) : null}
                </li>
              )
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <select value={addType} onChange={(e) => setAddType(e.target.value as EditorBlockType)} className="h-9 rounded-md border bg-background px-3 text-sm" aria-label="Block type to add">
              {EDITOR_BLOCK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BLOCK_INFO[t].label}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={add} disabled={lesson.blocks.length >= MAX_BLOCKS}>
              Add block
            </Button>
          </div>

          <section className="grid gap-2 rounded-xl border bg-card p-5">
            <Label htmlFor="l-takeaways">Key takeaways (one per line, up to 8)</Label>
            <Textarea
              id="l-takeaways"
              value={takeaways}
              rows={4}
              onChange={(e) => {
                setTakeaways(e.target.value)
                setDirty(true)
              }}
            />
          </section>
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" onClick={save} disabled={saving} loading={saving}>
          {saving ? "Saving…" : id ? "Save changes" : "Save draft"}
        </Button>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-muted-foreground" : "text-sm text-destructive-foreground"}>
            {message.text}
          </p>
        ) : dirty ? (
          <p className="text-sm text-muted-foreground">Unsaved changes</p>
        ) : null}
      </div>
    </div>
  )
}
