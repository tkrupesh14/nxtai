"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

type Section = { key: string; gated: boolean; node: React.ReactNode; /** Spoken pieces for "Listen". */ speech?: string[] }

type NarrationStatus = "idle" | "playing" | "paused" | "waiting"
type Narration = {
  supported: boolean
  status: NarrationStatus
  section: number
  /** Start (or pause, if it is already playing) reading at a section. */
  toggle: (section: number) => void
}

const LectureContext = createContext<{ markAnswered: (key: string) => void; narration: Narration | null }>({
  markAnswered: () => {},
  narration: null,
})

const RATES = [0.8, 1, 1.25, 1.5] as const
const RATE_KEY = "nxtai:narration-rate"

/** Best English voice on this device: Indian English first, then natural/neural voices. */
function pickVoice(voices: SpeechSynthesisVoice[]) {
  const score = (v: SpeechSynthesisVoice) => {
    const lang = v.lang.replace("_", "-").toLowerCase()
    if (!lang.startsWith("en")) return -1
    let s = 0
    if (lang === "en-in") s += 4
    else if (lang === "en-gb" || lang === "en-us") s += 2
    if (/natural|neural|premium|enhanced|google/i.test(v.name)) s += 3
    if (v.localService) s += 1
    return s
  }
  let best: SpeechSynthesisVoice | null = null
  for (const v of voices) if (score(v) >= 0 && (!best || score(v) > score(best))) best = v
  return best
}

/**
 * Reads sections aloud with the browser's own speech engine (no server, no cost).
 * Each section is spoken in short pieces because browsers stall on long utterances; pausing cancels and
 * remembers the piece, which works on phones where speechSynthesis.pause() does not.
 */
function useNarrator({
  sections,
  revealed,
  setRevealed,
  answered,
  afterSpeech,
}: {
  sections: Section[]
  revealed: number
  setRevealed: (n: number) => void
  answered: Set<string>
  afterSpeech: string[]
}) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<NarrationStatus>("idle")
  const [section, setSection] = useState(0)
  const [rate, setRate] = useState<number>(1)
  const pos = useRef({ section: 0, chunk: 0 })
  const run = useRef(0) // bumps on every stop/pause so stale "end" events are ignored
  const voice = useRef<SpeechSynthesisVoice | null>(null)
  const latest = useRef({ sections, revealed, answered, afterSpeech, rate, setRevealed })
  latest.current = { sections, revealed, answered, afterSpeech, rate, setRevealed }

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    setSupported(true)
    try {
      const saved = Number(localStorage.getItem(RATE_KEY))
      if ((RATES as readonly number[]).includes(saved)) setRate(saved)
    } catch {}
    const load = () => (voice.current = pickVoice(synth.getVoices()))
    load()
    synth.addEventListener?.("voiceschanged", load)
    return () => {
      synth.removeEventListener?.("voiceschanged", load)
      run.current++
      synth.cancel()
    }
  }, [])

  // Section index -1 means the end-of-lesson summary.
  const piecesFor = (i: number) => (i === -1 ? latest.current.afterSpeech : (latest.current.sections[i]?.speech ?? []))

  const speak = useCallback((i: number, chunk: number) => {
    const synth = window.speechSynthesis
    const id = ++run.current
    pos.current = { section: i, chunk }
    setSection(i)
    setStatus("playing")
    synth.cancel()
    const pieces = piecesFor(i)
    if (chunk >= pieces.length) {
      next(i, id)
      return
    }
    const u = new SpeechSynthesisUtterance(pieces[chunk])
    if (voice.current) {
      u.voice = voice.current
      u.lang = voice.current.lang
    } else u.lang = "en-IN"
    u.rate = latest.current.rate
    u.onend = () => {
      if (run.current !== id) return
      speak(i, chunk + 1)
    }
    u.onerror = (e) => {
      if (run.current !== id || e.error === "interrupted" || e.error === "canceled") return
      run.current++
      setStatus("idle")
    }
    // Some engines drop an utterance queued in the same tick as cancel().
    setTimeout(() => {
      if (run.current !== id) return
      synth.resume()
      synth.speak(u)
    }, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** After a section: go on to the next one, reveal it, or wait for the practice question. */
  const next = useCallback(
    (i: number, id: number) => {
      if (run.current !== id) return
      const { sections, revealed, answered, afterSpeech, setRevealed } = latest.current
      if (i === -1) return setStatus("idle")
      const s = sections[i]
      if (s.gated && !answered.has(s.key)) {
        pos.current = { section: i + 1, chunk: 0 }
        setStatus("waiting")
        return
      }
      if (i + 1 < sections.length) {
        if (i + 1 >= revealed) setRevealed(i + 2)
        speak(i + 1, 0)
      } else if (afterSpeech.length) speak(-1, 0)
      else setStatus("idle")
    },
    [speak],
  )

  const stop = useCallback(() => {
    run.current++
    window.speechSynthesis.cancel()
    setStatus("idle")
  }, [])

  const pause = useCallback(() => {
    run.current++
    window.speechSynthesis.cancel()
    setStatus("paused")
  }, [])

  const resume = useCallback(() => speak(pos.current.section, pos.current.chunk), [speak])

  const toggle = useCallback(
    (i: number) => {
      if (status === "playing" && pos.current.section === i) pause()
      else if (status === "paused" && pos.current.section === i) resume()
      else speak(i, 0)
    },
    [status, pause, resume, speak],
  )

  // The learner answered the question narration was waiting on: carry on with the lecture.
  useEffect(() => {
    if (status !== "waiting") return
    const gate = sections[pos.current.section - 1]
    if (gate && answered.has(gate.key)) {
      const i = pos.current.section
      if (i < sections.length) {
        if (i >= revealed) setRevealed(i + 1)
        speak(i, 0)
      } else if (afterSpeech.length) speak(-1, 0)
      else setStatus("idle")
    }
  }, [answered, status, sections, revealed, setRevealed, speak, afterSpeech.length])

  const changeRate = useCallback(
    (r: number) => {
      setRate(r)
      latest.current.rate = r
      try {
        localStorage.setItem(RATE_KEY, String(r))
      } catch {}
      // Apply at once: restart the current piece at the new speed.
      if (status === "playing") speak(pos.current.section, pos.current.chunk)
    },
    [status, speak],
  )

  return { supported, status, section, rate, toggle, pause, resume, stop, changeRate, speak }
}

const storageKey = (lessonId: string) => `nxtai:lecture:${lessonId}`

/**
 * Reveals a lesson one section at a time, like a professor moving through a class.
 * "Pause and think" sections (gated) must be answered before continuing.
 */
export function LectureStepper({
  lessonId,
  sections,
  after,
  afterSpeech = [],
  startComplete,
}: {
  lessonId: string
  sections: Section[]
  /** Shown once every section is revealed (takeaways + quiz). */
  after: React.ReactNode
  /** Spoken after the last section (the key takeaways). */
  afterSpeech?: string[]
  startComplete: boolean
}) {
  const [revealed, setRevealed] = useState(startComplete ? sections.length : 1)
  const [answered, setAnswered] = useState<Set<string>>(() => new Set())
  const lastRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])
  const didMount = useRef(false)
  const narrator = useNarrator({ sections, revealed, setRevealed, answered, afterSpeech })
  const canNarrate = narrator.supported && sections.some((s) => s.speech?.length)

  // Remember how far the learner got (per-browser convenience only).
  useEffect(() => {
    if (startComplete) return
    try {
      const saved = Number(localStorage.getItem(storageKey(lessonId)))
      if (saved > 1) setRevealed(Math.min(saved, sections.length))
    } catch {}
  }, [lessonId, sections.length, startComplete])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(lessonId), String(revealed))
    } catch {}
    if (didMount.current) lastRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    didMount.current = true
  }, [lessonId, revealed])

  const markAnswered = useCallback((key: string) => {
    setAnswered((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
  }, [])

  /** "Listen" in the top bar starts at the section on screen. */
  function listenHere() {
    let at = 0
    sectionRefs.current.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) at = i
    })
    narrator.speak(at, 0)
  }

  const narration: Narration | null = canNarrate
    ? { supported: true, status: narrator.status, section: narrator.section, toggle: narrator.toggle }
    : null

  const current = sections[revealed - 1]
  const blocked = current?.gated && !answered.has(current.key)
  const done = revealed >= sections.length
  const percent = Math.round((revealed / sections.length) * 100)

  return (
    <LectureContext.Provider value={{ markAnswered, narration }}>
      <div className="sticky top-[57px] z-10 -mx-4 mb-6 border-b bg-background/90 px-4 py-2 backdrop-blur">
        <div className="flex min-h-7 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="shrink-0">
            Section {Math.min(revealed, sections.length)} of {sections.length}
          </span>
          <div className="flex min-w-0 items-center gap-3">
            {canNarrate && <NarrationControls narrator={narrator} onListen={listenHere} total={sections.length} />}
            {!done && narrator.status === "idle" && (
              <button type="button" className="hover:text-foreground hover:underline" onClick={() => setRevealed(sections.length)}>
                Show whole lesson
              </button>
            )}
          </div>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="grid gap-8">
        {sections.slice(0, revealed).map((s, i) => (
          <div
            key={s.key}
            ref={(el) => {
              sectionRefs.current[i] = el
              if (i === revealed - 1) lastRef.current = el
            }}
            className={cn(
              "min-w-0 scroll-mt-28 rounded-lg transition-[outline-color]",
              i === revealed - 1 && i > 0 && "lecture-enter",
              narrator.section === i && narrator.status !== "idle"
                ? "outline-2 outline-offset-8 outline-primary/25 outline"
                : "outline-transparent",
            )}
            aria-current={narrator.section === i && narrator.status === "playing" ? "step" : undefined}
          >
            {s.node}
          </div>
        ))}
      </div>

      {!done ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <Button size="lg" onClick={() => setRevealed((r) => r + 1)} disabled={blocked}>
            Continue
          </Button>
          {blocked && (
            <p className="text-xs text-muted-foreground">
              Answer the question above to continue{narrator.status === "waiting" ? "; I'll keep reading after that" : ""}.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-10">{after}</div>
      )}
    </LectureContext.Provider>
  )
}

function NarrationControls({
  narrator,
  onListen,
  total,
}: {
  narrator: ReturnType<typeof useNarrator>
  onListen: () => void
  total: number
}) {
  const { status, section, rate } = narrator
  if (status === "idle") {
    return (
      <button type="button" className="font-medium text-foreground hover:underline" onClick={onListen}>
        <span aria-hidden>🔊</span> Listen
      </button>
    )
  }
  const where = section === -1 ? "Takeaways" : `Reading ${section + 1}/${total}`
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Narration">
      <span className={cn(status !== "waiting" && "hidden sm:inline")} aria-live="polite">
        {status === "waiting" ? "Answer to go on" : where}
      </span>
      {status !== "waiting" && (
        <button
          type="button"
          className="rounded-md border bg-background px-2 py-0.5 font-medium text-foreground hover:bg-muted"
          onClick={status === "playing" ? narrator.pause : narrator.resume}
          aria-label={status === "playing" ? "Pause reading" : "Resume reading"}
        >
          {status === "playing" ? "❚❚ Pause" : "▶ Resume"}
        </button>
      )}
      <select
        value={rate}
        onChange={(e) => narrator.changeRate(Number(e.target.value))}
        className="rounded-md border bg-background px-1 py-0.5 text-foreground"
        aria-label="Reading speed"
      >
        {RATES.map((r) => (
          <option key={r} value={r}>
            {r}×
          </option>
        ))}
      </select>
      <button
        type="button"
        className="rounded-md px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
        onClick={narrator.stop}
        aria-label="Stop reading"
      >
        ✕
      </button>
    </div>
  )
}

/** Per-section "Listen" link, next to "Ask about this section". */
export function ListenToSection({ section }: { section: number }) {
  const { narration } = useContext(LectureContext)
  if (!narration) return null
  const here = narration.section === section
  const label = here && narration.status === "playing" ? "❚❚ Pause" : here && narration.status === "paused" ? "▶ Resume" : "🔊 Listen"
  return (
    <button
      type="button"
      onClick={() => narration.toggle(section)}
      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
    >
      {label}
    </button>
  )
}

/** In-lesson practice question. Not graded; the answer is shown after trying. Content is pre-rendered Markdown. */
export function Checkpoint({
  id,
  answerIndex,
  question,
  options,
  explanation,
}: {
  id: string
  answerIndex: number
  question: React.ReactNode
  options: React.ReactNode[]
  explanation: React.ReactNode
}) {
  const { markAnswered } = useContext(LectureContext)
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = checked && choice === answerIndex

  function check() {
    setChecked(true)
    markAnswered(id)
  }

  return (
    <fieldset className="mt-4 min-w-0" disabled={checked}>
      <legend className="sr-only">Practice question</legend>
      <div className="font-medium">{question}</div>
      <div className="mt-3 grid gap-2" role="radiogroup">
        {options.map((opt, i) => (
          <label
            key={i}
            className={cn(
              "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border bg-background px-4 py-3 text-sm transition-colors",
              !checked && "hover:bg-muted/60",
              !checked && choice === i && "border-primary ring-1 ring-primary",
              checked && i === answerIndex && "border-green-600 bg-green-600/10",
              checked && choice === i && i !== answerIndex && "border-destructive bg-destructive/10",
            )}
          >
            <input
              type="radio"
              name={`cp-${id}`}
              checked={choice === i}
              onChange={() => setChoice(i)}
              className="mt-1 accent-[var(--primary)]"
            />
            <div className="min-w-0 flex-1">{opt}</div>
          </label>
        ))}
      </div>
      {!checked ? (
        <Button type="button" size="sm" className="mt-3" onClick={check} disabled={choice === null}>
          Check my answer
        </Button>
      ) : (
        <div className={cn("mt-3 text-sm", correct ? "text-green-700 dark:text-green-400" : "text-destructive-foreground")}>
          <p className="font-medium">{correct ? "Exactly right." : "Not quite."}</p>
          <div className="text-muted-foreground">{explanation}</div>
        </div>
      )}
    </fieldset>
  )
}
