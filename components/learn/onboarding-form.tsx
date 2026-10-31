"use client"

import { useActionState, useEffect, useState } from "react"

import { createCourse, type OnboardingState } from "@/app/(learn)/onboarding/actions"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { LEVEL_LABELS, STYLE_LABELS, TIMELINE_LABELS } from "@/lib/learning/labels"
import { cn } from "@/lib/utils"

type Defaults = {
  level?: string | null
  background?: string | null
  hours_per_week?: number | null
  learning_style?: string | null
  timeline?: string | null
}

const GOAL_IDEAS = [
  "Become job-ready as a frontend developer",
  "Learn data analysis with Python",
  "Prepare for system design interviews",
  "Understand how LLMs work and build with them",
]

const STEPS = ["Your goal", "About you", "Your schedule"] as const

function ChoiceGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string
  options: Record<string, string>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
      {Object.entries(options).map(([key, label]) => (
        <label
          key={key}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/60",
            value === key && "border-primary bg-primary/5 ring-1 ring-primary",
          )}
        >
          <input
            type="radio"
            name={name}
            value={key}
            checked={value === key}
            onChange={() => onChange(key)}
            className="accent-[var(--primary)]"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

const BUILD_STEPS = [
  "Reading your goal and background…",
  "Choosing what to skip and what to focus on…",
  "Sequencing modules from fundamentals to projects…",
  "Sizing lessons to your schedule…",
  "Almost there — saving your course…",
]

function Building() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, BUILD_STEPS.length - 1)), 12000)
    return () => clearInterval(t)
  }, [])
  return (
    <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8 text-center">
      <div className="mx-auto mb-5 size-10 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden />
      <p className="font-medium">Designing your course</p>
      <p className="mt-1 text-sm text-muted-foreground">{BUILD_STEPS[i]}</p>
      <p className="mt-4 text-xs text-muted-foreground">This usually takes under a minute. Please keep this page open.</p>
    </div>
  )
}

export function OnboardingForm({ defaults }: { defaults?: Defaults }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createCourse, {})
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState("")
  const [level, setLevel] = useState(defaults?.level ?? "")
  const [background, setBackground] = useState(defaults?.background ?? "")
  const [style, setStyle] = useState(defaults?.learning_style ?? "mixed")
  const [hours, setHours] = useState(String(defaults?.hours_per_week ?? 5))
  const [timeline, setTimeline] = useState(defaults?.timeline ?? "1_month")

  const canNext = step === 0 ? goal.trim().length >= 3 && level !== "" : true

  if (pending) return <Building />

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Enter on an early step moves forward instead of submitting half the answers.
        if (step < STEPS.length - 1) {
          e.preventDefault()
          if (canNext) setStep((s) => s + 1)
        }
      }}
      className="rounded-xl border bg-card p-6 md:p-8"
    >
      {/* All answers are submitted together from the last step. */}
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="background" value={background} />
      <input type="hidden" name="learning_style" value={style} />
      <input type="hidden" name="hours_per_week" value={hours} />
      <input type="hidden" name="timeline" value={timeline} />

      <ol className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2">
            <span className={cn("h-1 rounded-full bg-muted", i <= step && "bg-primary")} />
            <span className={cn(i === step && "font-medium text-foreground")} aria-current={i === step ? "step" : undefined}>
              {s}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="goal-input">What do you want to learn or achieve?</Label>
            <Textarea
              id="goal-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Build and deploy full-stack web apps with React and Node.js"
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              {GOAL_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={() => setGoal(idea)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>How much do you already know about it?</Label>
            <ChoiceGroup name="level-choice" options={LEVEL_LABELS} value={level} onChange={setLevel} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="background-input">Your background</Label>
            <Textarea
              id="background-input"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="e.g. Final-year CS student, comfortable with Java, never used JavaScript"
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">Studies, job, tools you know. It helps skip what you already know.</p>
          </div>
          <div className="grid gap-2">
            <Label>How do you like to learn?</Label>
            <ChoiceGroup name="style-choice" options={STYLE_LABELS} value={style} onChange={setStyle} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="hours-input">Hours per week you can spend</Label>
            <Input
              id="hours-input"
              type="number"
              min={1}
              max={80}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="max-w-32"
            />
          </div>
          <div className="grid gap-2">
            <Label>When do you want to reach your goal?</Label>
            <ChoiceGroup name="timeline-choice" options={TIMELINE_LABELS} value={timeline} onChange={setTimeline} />
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {state.error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue
          </Button>
        ) : (
          <Button type="submit">Build my course</Button>
        )}
      </div>
    </form>
  )
}
