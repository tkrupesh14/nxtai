"use client"

import { useState, useTransition } from "react"

import { replyToLearner } from "@/app/(learn)/teach/actions"
import { Md } from "@/components/learn/lesson-blocks"
import { Button } from "@/components/site/ui/button"
import { Textarea } from "@/components/site/ui/textarea"
import type { InboxItem } from "@/lib/teach/bank"

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })

function Item({ item }: { item: InboxItem }) {
  const [reply, setReply] = useState(item.professor_reply ?? "")
  const [editing, setEditing] = useState(item.status === "open")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [sending, setSending] = useState<"answered" | "confirmed" | null>(null)

  const send = (status: "answered" | "confirmed") => {
    setSending(status)
    start(async () => {
      setError(null)
      const r = await replyToLearner(item.id, status, reply)
      setSending(null)
      if (r.ok) setEditing(false)
      else setError(r.message ?? "Something went wrong.")
    })
  }

  return (
    <li className="grid min-w-0 gap-3 rounded-lg border p-4 text-sm">
      <p className="text-xs text-muted-foreground">
        A learner · lesson &ldquo;{item.lesson_title}&rdquo; · {when(item.created_at)}
        {item.status === "answered" ? " · You replied" : item.status === "confirmed" ? " · You confirmed the AI's answer" : ""}
      </p>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Their question</p>
        <p className="mt-1 break-words">{item.question}</p>
      </div>
      <div className="rounded-md bg-muted/60 p-3">
        <p className="text-xs font-medium text-muted-foreground">Your AI version answered</p>
        <div className="mt-1 min-w-0">
          <Md compact>{item.ai_reply}</Md>
        </div>
      </div>
      {item.note ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Their note to you</p>
          <p className="mt-1 break-words">{item.note}</p>
        </div>
      ) : null}
      {editing ? (
        <div className="grid gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`reply-${item.id}`}>
            Your reply (the learner sees it in the lesson chat, under your name)
          </label>
          <Textarea id={`reply-${item.id}`} value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={3000} />
          <p className="text-xs text-muted-foreground">Help them understand, but don&apos;t give away answers to quiz or test questions.</p>
          {error ? (
            <p role="alert" className="text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" loading={sending === "answered"} disabled={pending} onClick={() => send("answered")}>
              Send reply
            </Button>
            <Button type="button" size="sm" variant="outline" loading={sending === "confirmed"} disabled={pending} onClick={() => send("confirmed")}>
              The AI&apos;s answer is right
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {item.professor_reply ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Your reply</p>
              <p className="mt-1 break-words whitespace-pre-line">{reply || item.professor_reply}</p>
            </div>
          ) : null}
          <Button type="button" size="sm" variant="ghost" className="justify-self-start" onClick={() => setEditing(true)}>
            Edit your reply
          </Button>
        </div>
      )}
    </li>
  )
}

/** Learners' questions about your AI version's answers. You never see who sent them. */
export function Inbox({ items }: { items: InboxItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions yet. When a learner asks you to check an AI answer, it appears here.</p>
  }
  return (
    <ul className="grid min-w-0 gap-3" aria-label="Learner questions">
      {items.map((i) => (
        <Item key={i.id} item={i} />
      ))}
    </ul>
  )
}
