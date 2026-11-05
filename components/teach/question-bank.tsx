"use client"

import { useState, useTransition } from "react"

import { removeBankQuestion, saveBankQuestion, setBankQuestionStatus } from "@/app/(learn)/teach/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import type { BankQuestion } from "@/lib/teach/bank"
import { languageName, TEACH_LANGUAGES } from "@/lib/teach/subjects"

type Draft = { topic: string; language: "en" | "hi"; question: string; options: string[]; answer_index: number; explanation: string }
const LETTERS = ["A", "B", "C", "D"]
const empty = (language: "en" | "hi"): Draft => ({ topic: "", language, question: "", options: ["", "", "", ""], answer_index: -1, explanation: "" })

/** Write multiple-choice questions; published ones go into the tests of courses your AI version teaches. */
export function QuestionBank({ questions, languages, canPublish }: { questions: BankQuestion[]; languages: string[]; canPublish: boolean }) {
  const defaultLanguage = languages[0] === "hi" ? "hi" : "en"
  const [draft, setDraft] = useState<Draft>(empty(defaultLanguage))
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, startSave] = useTransition()
  const [busy, startRow] = useTransition()
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  function save() {
    if (draft.answer_index < 0) return setMessage({ ok: false, text: "Choose the correct option." })
    startSave(async () => {
      const r = await saveBankQuestion(editing, draft)
      if (r.ok) {
        setDraft(empty(draft.language))
        setEditing(null)
        setMessage({ ok: true, text: editing ? "Question updated." : "Question added as a draft. Publish it to use it in tests." })
      } else setMessage({ ok: false, text: r.message ?? "Something went wrong." })
    })
  }

  function edit(q: BankQuestion) {
    setEditing(q.id)
    setMessage(null)
    setDraft({ topic: q.topic ?? "", language: q.language, question: q.question, options: [...q.options], answer_index: q.answer_index, explanation: q.explanation ?? "" })
  }

  const row = (fn: () => Promise<{ ok?: boolean; message?: string }>) =>
    startRow(async () => {
      const r = await fn()
      if (!r.ok) setMessage({ ok: false, text: r.message ?? "Something went wrong." })
    })

  return (
    <div className="grid gap-6">
      <form
        className="grid gap-4 rounded-lg border p-4"
        aria-label={editing ? "Edit question" : "New question"}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="bq-question">Question</Label>
          <Textarea
            id="bq-question"
            value={draft.question}
            onChange={(e) => set({ question: e.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="A ball is thrown straight up. At the top of its path, what is its acceleration?"
          />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Options (tick the correct one)</legend>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="bq-answer"
                checked={draft.answer_index === i}
                onChange={() => set({ answer_index: i })}
                aria-label={`Option ${LETTERS[i]} is correct`}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              <Input
                value={o}
                onChange={(e) => set({ options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })}
                maxLength={300}
                aria-label={`Option ${LETTERS[i]}`}
                placeholder={`Option ${LETTERS[i]}`}
                className="min-w-0"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Make wrong options mistakes students really make. The order is shuffled for each learner.</p>
        </fieldset>
        <div className="grid gap-2">
          <Label htmlFor="bq-explanation">Why it&apos;s right (shown after the test)</Label>
          <Textarea id="bq-explanation" value={draft.explanation} onChange={(e) => set({ explanation: e.target.value })} rows={2} maxLength={1000} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="bq-topic">Topic</Label>
            <Input id="bq-topic" value={draft.topic} onChange={(e) => set({ topic: e.target.value })} maxLength={120} placeholder="Projectile motion" />
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Language</legend>
            <div className="flex flex-wrap gap-4">
              {TEACH_LANGUAGES.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="bq-language" checked={draft.language === l.id} onChange={() => set({ language: l.id as "en" | "hi" })} className="size-4" />
                  {l.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-green-700 dark:text-green-400" : "text-sm text-destructive-foreground"}>
            {message.text}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : "Add question"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null)
                setDraft(empty(draft.language))
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No questions yet.</p>
      ) : (
        <ul className="grid min-w-0 gap-2" aria-label="Your questions">
          {questions.map((q) => (
            <li key={q.id} className="grid min-w-0 gap-2 rounded-md border px-3 py-2 text-sm">
              <p className="font-medium break-words">{q.question}</p>
              <p className="text-xs text-muted-foreground break-words">
                {q.status === "published" ? "Published" : "Draft"} · {languageName(q.language)}
                {q.topic ? ` · ${q.topic}` : ""} · Answer: {LETTERS[q.answer_index]}) {q.options[q.answer_index]}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => edit(q)} aria-label={`Edit question: ${q.question}`}>
                  Edit
                </Button>
                {q.status === "draft" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || !canPublish}
                    title={canPublish ? undefined : "You can publish once Krpex has approved your profile"}
                    onClick={() => row(() => setBankQuestionStatus(q.id, "published"))}
                    aria-label={`Publish question: ${q.question}`}
                  >
                    Publish
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => row(() => setBankQuestionStatus(q.id, "draft"))} aria-label={`Unpublish question: ${q.question}`}>
                    Unpublish
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => confirm("Remove this question for good?") && row(() => removeBankQuestion(q.id))}
                  aria-label={`Remove question: ${q.question}`}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
