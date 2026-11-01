"use client"

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"

import { askProfessorAction } from "@/app/(learn)/learn/[courseId]/[lessonId]/professor-actions"
import { Md } from "@/components/learn/lesson-blocks"
import { ProfessorAvatar } from "@/components/learn/professor"
import { Button } from "@/components/site/ui/button"
import type { Professor } from "@/lib/learning/catalog"
import { ASK_LIMITS, QUICK_KINDS, type ChatTurn, type QuickKind } from "@/lib/learning/professor"
import { cn } from "@/lib/utils"

const ChatContext = createContext<{ open: (section?: number) => void } | null>(null)

type Note = { id: string; note: string }
type Entry = ChatTurn | Note
const isNote = (e: Entry): e is Note => "note" in e

/** Wraps the lesson so "Ask about this section" links can open the professor panel. */
export function ProfessorChat({
  courseId,
  lessonId,
  professor,
  sectionLabels,
  initialTurns,
  initialUsedToday,
  initialUsedLesson,
  initialUsedQuick,
  limits,
  initialCredits,
  children,
}: {
  courseId: string
  lessonId: string
  professor: Professor
  sectionLabels: string[]
  initialTurns: ChatTurn[]
  initialUsedToday: number
  initialUsedLesson: number
  initialUsedQuick: number
  limits: { askDay: number; askLesson: number; quickDay: number }
  initialCredits: number
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [section, setSection] = useState<number>(-1)
  const [entries, setEntries] = useState<Entry[]>(initialTurns)
  const [usedToday, setUsedToday] = useState(initialUsedToday)
  const [usedLesson, setUsedLesson] = useState(initialUsedLesson)
  const [usedQuick, setUsedQuick] = useState(initialUsedQuick)
  const [credits, setCredits] = useState(initialCredits)
  const [text, setText] = useState("")
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const leftToday = Math.max(limits.askDay - usedToday, 0)
  const leftLesson = Math.max(limits.askLesson - usedLesson, 0)
  const freeLeft = leftToday > 0 && leftLesson > 0
  // Once the free allowance is used, each question costs 1 credit.
  const canAsk = freeLeft || credits > 0
  const leftQuick = Math.max(limits.quickDay - usedQuick, 0)
  const firstName = professor.name.replace(/^(Prof\.|Dr\.)\s*/, "").split(" ")[0]

  function open(s?: number) {
    if (typeof s === "number") setSection(s)
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener("keydown", onKey)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ block: "end" })
  }, [entries, pending, isOpen])

  function send(kind: "ask" | QuickKind) {
    const question = text.trim()
    if (pending || (kind === "ask" && question.length < 3)) return
    startTransition(async () => {
      const res = await askProfessorAction(courseId, lessonId, { kind, section, question: kind === "ask" ? question : undefined })
      if (typeof res.credits === "number") setCredits(res.credits)
      if (res.ok) {
        setEntries((prev) => [...prev, res.turn])
        if (kind === "ask") setText("")
        // usedToday is -1 for cached (free) answers. For quick buttons it counts quick answers.
        if (res.usedToday >= 0 && kind === "ask" && !res.paid) {
          setUsedToday(res.usedToday)
          setUsedLesson(res.usedLesson)
        } else if (res.usedToday >= 0) {
          setUsedQuick(res.usedToday)
        }
      } else {
        setEntries((prev) => [...prev, { id: `n${Date.now()}`, note: res.message }])
        if (kind === "ask" && typeof res.usedToday === "number") setUsedToday(res.usedToday)
        if (kind === "ask" && typeof res.usedLesson === "number") setUsedLesson(res.usedLesson)
        if (kind !== "ask" && typeof res.usedToday === "number") setUsedQuick(res.usedToday)
      }
    })
  }

  return (
    <ChatContext.Provider value={{ open }}>
      {children}

      {!isOpen && (
        <button
          type="button"
          onClick={() => open()}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-2 rounded-full border bg-card py-1.5 pr-4 pl-1.5 text-sm font-medium shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <ProfessorAvatar professor={professor} size="sm" />
          Ask {firstName}
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setIsOpen(false)} aria-hidden />
          <section
            role="dialog"
            aria-label={`Ask ${professor.name}`}
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-2xl border bg-background shadow-2xl md:inset-x-auto md:top-[57px] md:right-0 md:bottom-0 md:max-h-none md:w-[400px] md:rounded-none md:border-y-0 md:border-r-0"
          >
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <ProfessorAvatar professor={professor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{professor.name}</p>
                <p className="text-[11px] text-muted-foreground">AI professor · answers about this lesson</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                ×
              </button>
            </header>

            <div className="min-h-40 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
              {entries.length === 0 && !pending && (
                <p className="text-sm text-muted-foreground">
                  Stuck on something in this lesson? Ask me, or pick a section and tap a quick button.
                </p>
              )}
              <div className="grid gap-4">
                {entries.map((e) =>
                  isNote(e) ? (
                    <p key={e.id} className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {e.note}
                    </p>
                  ) : (
                    <div key={e.id} className="grid gap-2">
                      <div className="ml-8 justify-self-end rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                        {e.kind === "ask" ? e.question : QUICK_KINDS[e.kind].label}
                        {e.section >= 0 && sectionLabels[e.section] && (
                          <span className="mt-0.5 block text-[11px] opacity-80">About: {sectionLabels[e.section]}</span>
                        )}
                      </div>
                      <div className="mr-4 min-w-0 rounded-2xl rounded-tl-sm border bg-card px-3 py-2">
                        <Md compact>{e.reply}</Md>
                      </div>
                    </div>
                  ),
                )}
                {pending && (
                  <p className="text-sm text-muted-foreground" role="status">
                    {professor.name} is thinking…
                  </p>
                )}
              </div>
              <div ref={endRef} />
            </div>

            <div className="grid gap-2 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="pc-section">
                  Section
                </label>
                <select
                  id="pc-section"
                  value={section}
                  onChange={(e) => setSection(Number(e.target.value))}
                  className="h-8 max-w-full min-w-0 flex-1 truncate rounded-md border bg-background px-2 text-xs"
                >
                  <option value={-1}>Whole lesson</option>
                  {sectionLabels.map((l, i) => (
                    <option key={i} value={i}>
                      {i + 1}. {l}
                    </option>
                  ))}
                </select>
              </div>
              {section >= 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(QUICK_KINDS) as QuickKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={pending}
                      onClick={() => send(k)}
                      className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {QUICK_KINDS[k].label}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  send("ask")
                }}
              >
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      send("ask")
                    }
                  }}
                  maxLength={ASK_LIMITS.maxQuestionChars}
                  rows={2}
                  disabled={!canAsk}
                  placeholder={canAsk ? (freeLeft ? "Ask about this lesson…" : "Ask (uses 1 credit)…") : "No free questions left today"}
                  aria-label="Your question"
                  className="min-w-0 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                />
                <Button type="submit" size="sm" disabled={!canAsk || pending || text.trim().length < 3}>
                  Ask
                </Button>
              </form>
              <div className="flex justify-between gap-3 text-[11px] text-muted-foreground">
                <p>
                  Free questions: {leftToday} of {limits.askDay} left today
                  {leftToday > 0 ? ` · ${leftLesson} for this lesson` : ""}
                  {(credits > 0 || !freeLeft) && (
                    <>
                      <br />
                      Credits: {credits}
                      {!freeLeft && credits > 0 ? " · 1 per question" : ""}
                      {!freeLeft && credits === 0 ? (
                        <>
                          {" · "}
                          <Link href="/account" className="underline hover:text-foreground">
                            Get more
                          </Link>
                        </>
                      ) : null}
                    </>
                  )}
                  <br />
                  Quick answers: {leftQuick} of {limits.quickDay} left · repeats are free
                </p>
                <span className="shrink-0">
                  {text.length}/{ASK_LIMITS.maxQuestionChars}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </ChatContext.Provider>
  )
}

/** Small link under a lecture section that opens the professor panel focused on it. */
export function AskAboutSection({ section }: { section: number }) {
  const ctx = useContext(ChatContext)
  if (!ctx) return null
  return (
    <button
      type="button"
      onClick={() => ctx.open(section)}
      className="justify-self-start text-xs text-muted-foreground hover:text-foreground hover:underline"
    >
      💬 Ask about this section
    </button>
  )
}
