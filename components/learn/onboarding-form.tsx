"use client"

import { useActionState, useEffect, useState } from "react"

import { createCourse, type OnboardingState } from "@/app/(learn)/onboarding/actions"
import { ProfessorCard } from "@/components/learn/professor"
import { SourceUpload, type UploadedSource } from "@/components/learn/source-upload"
import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { Textarea } from "@/components/site/ui/textarea"
import { CATEGORIES, GROUP_LABELS, getCategory, professorForCategory, type Professor } from "@/lib/learning/catalog"
import { LEVEL_LABELS, STYLE_LABELS, TIMELINE_LABELS } from "@/lib/learning/labels"
import { cn } from "@/lib/utils"

type Defaults = {
  level?: string | null
  background?: string | null
  hours_per_week?: number | null
  learning_style?: string | null
  timeline?: string | null
  language?: string | null
}

/** Lessons, quizzes, tests and chat are written in this language (8.3). */
const LANGUAGE_LABELS: Record<string, string> = { en: "English", hi: "हिन्दी (Hindi)" }

const STEPS = ["Category", "Subject & goal", "About you", "Schedule"] as const

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
  "Checking your goal…",
  "Your professor is reading your background…",
  "Choosing what to skip and what to focus on…",
  "Sequencing modules from fundamentals to projects…",
  "Almost there — saving your course…",
]

const MATERIAL_STEPS = [
  "Checking your goal…",
  "Your professor is reading your material…",
  "Following its chapters and order…",
  "Matching each lesson to the right pages…",
  "Almost there — saving your course…",
]

function Building({ professor, fromMaterial }: { professor: Professor; fromMaterial: boolean }) {
  const steps = fromMaterial ? MATERIAL_STEPS : BUILD_STEPS
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 6000)
    return () => clearInterval(t)
  }, [steps.length])
  return (
    <div role="status" aria-live="polite" className="rounded-xl border bg-card p-8 text-center">
      <div className="mx-auto mb-5 size-10 animate-spin rounded-full border-4 border-muted border-t-primary" aria-hidden />
      <p className="font-medium">{professor.name} is designing your course</p>
      <p className="mt-1 text-sm text-muted-foreground">{steps[i]}</p>
      <p className="mt-4 text-xs text-muted-foreground">This usually takes under a minute. Please keep this page open.</p>
    </div>
  )
}

export function OnboardingForm({
  defaults,
  plan = "free",
  pendingSources = [],
  teachers = [],
  initialTeacher,
}: {
  defaults?: Defaults
  plan?: "free" | "pro"
  /** Uploads from earlier today that haven't become a course yet. */
  pendingSources?: UploadedSource[]
  /** Live professors' AI versions (8.2), by subject ("science/physics"). */
  teachers?: { subject: string; persona: Professor }[]
  /** Chosen on a professor's page: start on their subject with them selected. */
  initialTeacher?: { id: string; subject: string }
}) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createCourse, {})
  const [initialCategory, initialSubcategory] = initialTeacher?.subject.split("/") ?? ["", ""]
  const [step, setStep] = useState(initialTeacher ? 1 : 0)
  const [categoryId, setCategoryId] = useState(initialCategory)
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategory)
  const [teacherId, setTeacherId] = useState(initialTeacher?.id ?? "")
  const [goal, setGoal] = useState("")
  const [level, setLevel] = useState(defaults?.level ?? "")
  const [background, setBackground] = useState(defaults?.background ?? "")
  const [style, setStyle] = useState(defaults?.learning_style ?? "mixed")
  const [hours, setHours] = useState(String(defaults?.hours_per_week ?? 5))
  const [timeline, setTimeline] = useState(defaults?.timeline ?? "1_month")
  const [language, setLanguage] = useState(defaults?.language === "hi" ? "hi" : "en")
  const [sources, setSources] = useState<UploadedSource[]>(pendingSources)

  const category = getCategory(categoryId)
  const subcategory = category?.subcategories.find((s) => s.id === subcategoryId) ?? null
  const subjectTeachers = teachers.filter((t) => t.subject === `${categoryId}/${subcategoryId}`)
  const teacher = subjectTeachers.find((t) => t.persona.realId === teacherId)?.persona ?? null
  const professor = teacher ?? professorForCategory(categoryId)
  const canNext =
    step === 0 ? category !== null : step === 1 ? subcategory !== null && goal.trim().length >= 3 && level !== "" : true

  function chooseCategory(id: string) {
    if (id !== categoryId) {
      setCategoryId(id)
      setSubcategoryId("")
      setGoal("")
    }
    setStep(1)
  }

  // The goal check suggested another category: switch to it and pick a subject there.
  function switchCategory(id: string) {
    setCategoryId(id)
    setSubcategoryId("")
    setStep(1)
  }

  if (pending) return <Building professor={professor} fromMaterial={sources.length > 0} />

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Enter on an early step moves forward instead of submitting half the answers.
        if (step < STEPS.length - 1) {
          e.preventDefault()
          if (canNext) setStep((s) => s + 1)
          return
        }
        // Only the "Build my course" button may start generation.
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null
        if (submitter?.dataset.build !== "1") e.preventDefault()
      }}
      className="rounded-xl border bg-card p-6 md:p-8"
    >
      {/* All answers are submitted together from the last step. */}
      <input type="hidden" name="category" value={categoryId} />
      <input type="hidden" name="subcategory" value={subcategoryId} />
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="background" value={background} />
      <input type="hidden" name="learning_style" value={style} />
      <input type="hidden" name="hours_per_week" value={hours} />
      <input type="hidden" name="timeline" value={timeline} />
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="sources" value={sources.map((s) => s.id).join(",")} />
      <input type="hidden" name="teacher" value={teacher?.realId ?? ""} />

      <ol className="mb-8 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-2">
            <span className={cn("h-1 rounded-full bg-muted", i <= step && "bg-primary")} />
            <span className={cn("hidden sm:inline", i === step && "font-medium text-foreground")} aria-current={i === step ? "step" : undefined}>
              {s}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-6">
          <p className="font-medium">What would you like to learn?</p>
          {(["tech", "non_tech"] as const).map((group) => (
            <section key={group} aria-labelledby={`group-${group}`}>
              <h2 id={`group-${group}`} className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group]}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {CATEGORIES.filter((c) => c.group === group).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => chooseCategory(c.id)}
                    aria-pressed={categoryId === c.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      categoryId === c.id && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {c.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {step === 1 && category && (
        <div className="grid gap-6">
          {subjectTeachers.length === 0 && (
            <ProfessorCard professor={professor} note={<span className="text-muted-foreground">{professor.bio}</span>} />
          )}
          <div className="grid gap-2">
            <Label>
              {category.icon} {category.name}: pick a subject
            </Label>
            <div role="radiogroup" className="flex flex-wrap gap-2">
              {category.subcategories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={subcategoryId === s.id}
                  onClick={() => setSubcategoryId(s.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                    subcategoryId === s.id && "border-primary bg-primary/10 font-medium text-foreground",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          {subcategory && (
            <div className="grid gap-2">
              <Label htmlFor="goal-input">What do you want to learn or achieve?</Label>
              <div className="flex flex-wrap gap-2">
                {subcategory.topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setGoal(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      goal === t && "border-primary text-foreground",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Textarea
                id="goal-input"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={sources.length ? "e.g. Prepare for my exam on this material" : "Pick a topic above or describe your own goal"}
                rows={2}
                maxLength={500}
              />
            </div>
          )}
          {subcategory && subjectTeachers.length > 0 && (
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Who should teach you?</legend>
              {[professorForCategory(category.id), ...subjectTeachers.map((t) => t.persona)].map((p) => {
                const value = p.realId ?? ""
                return (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/60",
                      teacherId === value && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <input
                      type="radio"
                      name="teacher-choice"
                      value={value}
                      checked={teacherId === value}
                      onChange={() => setTeacherId(value)}
                      className="mt-1 accent-[var(--primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">{p.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground text-pretty">{p.bio}</span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
          )}
          {subcategory && <SourceUpload plan={plan} sources={sources} onChange={setSources} />}
          {subcategory && (
            <div className="grid gap-2">
              <Label>How much do you already know about it?</Label>
              <ChoiceGroup name="level-choice" options={LEVEL_LABELS} value={level} onChange={setLevel} />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label>Teach me in</Label>
            <ChoiceGroup name="language-choice" options={LANGUAGE_LABELS} value={language} onChange={setLanguage} />
            <p className="text-xs text-muted-foreground">
              Lessons, quizzes, tests and your professor&apos;s answers. In Hindi, technical terms keep their English name
              in brackets, and formulas stay as usual.
            </p>
          </div>
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
            <p className="text-xs text-muted-foreground">
              Studies, job, hobbies. Your professor uses this to skip what you know and pick examples you relate to.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>How do you like to learn?</Label>
            <ChoiceGroup name="style-choice" options={STYLE_LABELS} value={style} onChange={setStyle} />
          </div>
        </div>
      )}

      {step === 3 && (
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
        <div role="alert" className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="text-destructive-foreground">{state.error}</p>
          {state.betterCategory && getCategory(state.betterCategory) && (
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => switchCategory(state.betterCategory!)}>
              Switch to {getCategory(state.betterCategory)!.icon} {getCategory(state.betterCategory)!.name}
            </Button>
          )}
          {state.reviseGoal && (
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setStep(1)}>
              Edit my goal
            </Button>
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          Back
        </Button>
        {/* Distinct keys: without them React reuses one <button> and flips its type to "submit"
            mid-click, so the Continue click on the second-last step submits the form. */}
        {step < STEPS.length - 1 ? (
          <Button key="next" type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue
          </Button>
        ) : (
          <Button key="submit" type="submit" data-build="1">
            Build my course
          </Button>
        )}
      </div>
    </form>
  )
}
