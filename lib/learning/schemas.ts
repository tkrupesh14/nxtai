import * as z from "zod/v4"

import { getSubcategory } from "./catalog"

// Shapes the model must return (strict structured outputs). Keep descriptions short: they are sent to the model.

export const GoalCheckSchema = z.object({
  verdict: z.enum(["ok", "wrong_category", "unclear", "not_allowed"]),
  message: z
    .string()
    .describe("Empty when ok. Otherwise one friendly sentence to the learner explaining what to change"),
  better_category: z.string().describe("For wrong_category: the matching category id from the list, else empty"),
})
export type GoalCheck = z.infer<typeof GoalCheckSchema>

export const CoursePlanSchema = z.object({
  welcome_message: z
    .string()
    .describe("2-3 sentences from the professor, in first person, welcoming the learner to this course and what they will build"),
  title: z.string().describe("Short, specific course title (max ~60 characters)"),
  summary: z.string().describe("2-3 sentences: what the learner will be able to do by the end"),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  estimated_weeks: z.number().int().describe("Realistic duration at the learner's weekly hours"),
  modules: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().describe("One sentence"),
        lessons: z.array(
          z.object({
            title: z.string(),
            objective: z.string().describe("One sentence starting with a verb: what the learner can do after"),
            est_minutes: z.number().int().describe("15-60"),
          }),
        ),
      }),
    )
    .describe("4-6 modules, each with 3-5 lessons, ordered from fundamentals to applied work"),
})
export type CoursePlan = z.infer<typeof CoursePlanSchema>

export const ProfessorReplySchema = z.object({
  verdict: z
    .enum(["answer", "off_topic", "not_allowed"])
    .describe("answer: about this lesson or course; off_topic: unrelated; not_allowed: harmful, cheating or abusive"),
  reply: z.string().describe("Markdown. answer: under 180 words. off_topic / not_allowed: one or two short sentences"),
})
export type ProfessorReply = z.infer<typeof ProfessorReplySchema>

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).describe("Exactly 4 plausible options"),
  answer_index: z.number().int().describe("0-based index of the correct option"),
  explanation: z.string().describe("1-2 sentences on why the answer is right"),
})
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

export const LESSON_BLOCK_TYPES = [
  "opening",
  "objectives",
  "explanation",
  "analogy",
  "worked_example",
  "checkpoint",
  "common_mistakes",
  "real_world",
  "summary",
  "homework",
  "diagram",
] as const
export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number]

export const DIAGRAM_KINDS = ["flow", "cycle", "hierarchy", "comparison", "timeline"] as const
export type DiagramKind = (typeof DIAGRAM_KINDS)[number]

/** A diagram described as data; the app draws it (no image generation, can't render broken). */
export const DiagramSchema = z.object({
  kind: z
    .enum(DIAGRAM_KINDS)
    .describe(
      "flow: steps of a process in order; cycle: a process that repeats; hierarchy: parts of a whole or a classification; comparison: options side by side; timeline: events in time order",
    ),
  items: z
    .array(
      z.object({
        label: z.string().describe("2-4 words (timeline: the date or period)"),
        detail: z.string().describe("At most 15 words; may be empty"),
        parent: z.number().int().nullable().describe("hierarchy only: index of the parent item, null for the root; otherwise null"),
      }),
    )
    .describe("flow/cycle: 3-7 items; hierarchy: 3-10 items with item 0 as the root; timeline: 3-8 items; comparison: empty"),
  columns: z.array(z.string()).describe("comparison only: 2-4 option names; otherwise empty"),
  rows: z
    .array(z.object({ label: z.string().describe("What is being compared"), cells: z.array(z.string()).describe("One short value per column") }))
    .describe("comparison only: 2-8 rows; otherwise empty"),
})
export type Diagram = z.infer<typeof DiagramSchema>

export const LessonBlockSchema = z.object({
  type: z.enum(LESSON_BLOCK_TYPES),
  title: z.string().describe("Short section heading"),
  body_markdown: z
    .string()
    .describe("The professor speaking in first person to the learner. GitHub Markdown; fenced code blocks allowed; no headings"),
  items: z.array(z.string()).describe("Bullet items for objectives, common_mistakes and summary; otherwise empty"),
  checkpoint: QuizQuestionSchema.nullable().describe("Only for type=checkpoint; otherwise null"),
  diagram: DiagramSchema.nullable().describe("Only for type=diagram; otherwise null"),
})
export type LessonBlock = z.infer<typeof LessonBlockSchema>

export const LessonContentSchema = z.object({
  blocks: z.array(LessonBlockSchema).describe("8-14 blocks forming one lecture, in teaching order"),
  key_takeaways: z.array(z.string()).describe("3-5 one-line takeaways"),
  quiz: z.array(QuizQuestionSchema).describe("4-5 questions that check understanding, not trivia"),
})
export type LessonContent = z.infer<typeof LessonContentSchema>

export const AssessmentSchema = z.object({
  questions: z.array(QuizQuestionSchema).describe("Multiple-choice questions, exactly 4 options each"),
})
export type Assessment = z.infer<typeof AssessmentSchema>

// What the learner tells us in onboarding.
export const OnboardingSchema = z
  .object({
  category: z.string().min(1, "Choose a category."),
  subcategory: z.string().min(1, "Choose a subject."),
  goal: z.string().trim().min(3, "Tell us what you want to learn.").max(500),
  level: z.enum(["new", "some", "comfortable", "advanced"]),
  background: z.string().trim().max(1000).optional().default(""),
  hours_per_week: z.coerce.number().int().min(1).max(80),
  learning_style: z.enum(["reading", "examples", "projects", "mixed"]),
  timeline: z.enum(["2_weeks", "1_month", "3_months", "no_rush"]),
  })
  .refine((v) => getSubcategory(v.category, v.subcategory) !== null, { message: "Choose a subject from the list." })
export type Onboarding = z.infer<typeof OnboardingSchema>

export { LEVEL_LABELS, STYLE_LABELS, TIMELINE_LABELS } from "./labels"
/** Minimum quiz score (percent) that completes a lesson. */
export const PASS_MARK = 60
/** Module tests and the final exam: pass mark (percent) and number of questions. Keep in sync with migration 014. */
export const ASSESSMENT_PASS_MARK = 70
export const ASSESSMENT_QUESTIONS = { module: 8, final: 20 } as const
export type AssessmentKind = keyof typeof ASSESSMENT_QUESTIONS
