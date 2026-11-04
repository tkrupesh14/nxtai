/**
 * The review queue (tracker 8.1, part 3): sample AI lessons that professors rate and correct. The lessons are
 * written from a subject, topic, level and language only, never from a learner's course, so no learner data is shown.
 * Pure and client-safe.
 */
import { z } from "zod"

import type { LessonArgs } from "@/lib/ai/llm"

export const REVIEW_LEVELS = ["Class 11–12 (school)", "JEE / NEET preparation", "First-year college"] as const

export const RATING_CRITERIA = [
  { key: "accuracy", label: "Accurate", hint: "The physics is correct: no wrong statements, formulas or units." },
  { key: "clarity", label: "Clear", hint: "A student could follow it on their own." },
  { key: "level_fit", label: "Right level", hint: "Pitched right for the level shown." },
  { key: "overall", label: "Overall", hint: "Would you be happy for your students to learn from it?" },
] as const
export type RatingKey = (typeof RATING_CRITERIA)[number]["key"]

const rating = z.number().int().min(1, "Rate every question from 1 to 5.").max(5)

export const BlockNoteSchema = z
  .object({
    block: z.number().int().min(0),
    note: z.string().trim().max(2000),
    suggestion: z.string().trim().max(20000),
  })
  .refine((n) => n.note || n.suggestion, "A note can't be empty.")
export type BlockNote = z.infer<typeof BlockNoteSchema>

export const ReviewSchema = z.object({
  accuracy: rating,
  clarity: rating,
  level_fit: rating,
  overall: rating,
  comment: z.string().trim().max(4000, "The comment is too long (4000 characters at most)."),
  block_notes: z.array(BlockNoteSchema).max(30),
})
export type Review = z.infer<typeof ReviewSchema>

export const GenerateReviewLessonSchema = z.object({
  title: z.string().trim().min(3, "Enter the lesson topic.").max(200),
  objective: z.string().trim().max(500),
  level: z.enum(REVIEW_LEVELS),
  language: z.enum(["en", "hi"]),
})
export type GenerateReviewLesson = z.infer<typeof GenerateReviewLessonSchema>

/** What the lesson writer gets for a sample lesson: a one-lesson Physics course for a typical student at that level. */
export function reviewLessonArgs(input: GenerateReviewLesson): LessonArgs {
  return {
    categoryId: "science",
    courseTitle: "Physics",
    courseLevel: input.level,
    goal: `Understand ${input.title} well, at the ${input.level} level.`,
    background: `A typical ${input.level} student in India.`,
    outline: `» ${input.title}`,
    moduleTitle: "Physics",
    lessonTitle: input.title,
    objective: input.objective || `Understand and apply ${input.title}.`,
    previousLessonTitle: null,
    estMinutes: 30,
    learningStyle: null,
    sourceText: null,
    language: input.language,
  }
}

/** Average of a list of ratings, to one decimal place (null when there are none). */
export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}
