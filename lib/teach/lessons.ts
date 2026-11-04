/**
 * Model lessons professors write in the lesson editor (tracker 8.1). Same block format as AI lessons
 * (lib/learning/schemas.ts) so the lesson page components render them, and the AI can learn from them.
 * Pure and client-safe: the editor and the server action both validate with ModelLessonSchema.
 */
import { z } from "zod"

import type { LessonBlock, LessonBlockType } from "@/lib/learning/schemas"

/** Block types a professor can add (diagrams come later: they need their own editor). */
export const EDITOR_BLOCK_TYPES = [
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
] as const satisfies readonly LessonBlockType[]
export type EditorBlockType = (typeof EDITOR_BLOCK_TYPES)[number]

export const BLOCK_INFO: Record<EditorBlockType, { label: string; hint: string; items?: string }> = {
  opening: { label: "Opening", hint: "Welcome the learner and say why today's topic matters." },
  objectives: { label: "Objectives", hint: "What the learner will be able to do by the end.", items: "One objective per line" },
  explanation: { label: "Explanation", hint: "Teach one idea, in your own words." },
  analogy: { label: "Analogy", hint: "An everyday comparison that makes the idea click." },
  worked_example: { label: "Worked example", hint: "Solve a problem step by step, with your commentary.", items: "Steps (optional), one per line" },
  checkpoint: { label: "Practice question", hint: "A quick multiple-choice check. Learners see the answer after trying." },
  common_mistakes: { label: "Common mistakes", hint: "What students usually get wrong, and how to avoid it.", items: "One mistake per line" },
  real_world: { label: "In the real world", hint: "Where this shows up outside the classroom." },
  summary: { label: "Summary", hint: "The key points to remember.", items: "One point per line" },
  homework: { label: "Homework", hint: "Something to try before the next lesson.", items: "Tasks (optional), one per line" },
}

export const MAX_BLOCKS = 30

const text = (max: number) => z.string().max(max)
const CheckpointSchema = z.object({
  question: z.string().trim().min(3, "Write the practice question.").max(1000),
  options: z.array(z.string().trim().min(1, "Fill in all four options.").max(500)).length(4, "Give four options."),
  answer_index: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(3, "Explain why the answer is right.").max(1500),
})

export const EditorBlockSchema = z
  .object({
    type: z.enum(EDITOR_BLOCK_TYPES),
    title: text(200),
    body_markdown: text(20000),
    items: z.array(z.string().trim().min(1).max(500)).max(20),
    checkpoint: CheckpointSchema.nullable(),
  })
  .superRefine((b, ctx) => {
    if (b.type === "checkpoint" && !b.checkpoint) ctx.addIssue({ code: "custom", message: "A practice question needs its question and options." })
    if (b.type !== "checkpoint" && !b.body_markdown.trim() && b.items.length === 0) {
      ctx.addIssue({ code: "custom", message: `The ${BLOCK_INFO[b.type].label.toLowerCase()} block is empty.` })
    }
  })
export type EditorBlock = z.infer<typeof EditorBlockSchema>

export const ModelLessonSchema = z.object({
  title: z.string().trim().min(3, "Give the lesson a title.").max(200),
  topic: z.string().trim().max(120),
  language: z.enum(["en", "hi"]),
  objective: z.string().trim().max(500),
  blocks: z.array(EditorBlockSchema).min(1, "Add at least one block.").max(MAX_BLOCKS, `At most ${MAX_BLOCKS} blocks.`),
  key_takeaways: z.array(z.string().trim().min(1).max(300)).max(8),
})
export type ModelLesson = z.infer<typeof ModelLessonSchema>

export function emptyBlock(type: EditorBlockType): EditorBlock {
  return {
    type,
    title: "",
    body_markdown: "",
    items: [],
    checkpoint: type === "checkpoint" ? { question: "", options: ["", "", "", ""], answer_index: 0, explanation: "" } : null,
  }
}

/** A new lesson starts with the shape of a good class; professors fill it in or change it. */
export function lessonTemplate(language: "en" | "hi"): ModelLesson {
  return {
    title: "",
    topic: "",
    language,
    objective: "",
    blocks: (["opening", "objectives", "explanation", "worked_example", "checkpoint", "summary"] as const).map(emptyBlock),
    key_takeaways: [],
  }
}

/** The stored blocks as the lesson page components expect them. */
export function toLessonBlocks(blocks: EditorBlock[]): LessonBlock[] {
  return blocks.map((b) => ({ ...b, diagram: null }) as LessonBlock)
}

/** Blocks loaded from the database (drops anything the editor doesn't know, e.g. diagrams). */
export function fromStored(blocks: unknown): EditorBlock[] {
  if (!Array.isArray(blocks)) return []
  return blocks.flatMap((b) => {
    const parsed = EditorBlockSchema.safeParse({
      type: b?.type,
      title: typeof b?.title === "string" ? b.title : "",
      body_markdown: typeof b?.body_markdown === "string" ? b.body_markdown : "",
      items: Array.isArray(b?.items) ? b.items.filter((i: unknown) => typeof i === "string" && i.trim()) : [],
      checkpoint: b?.checkpoint ?? null,
    })
    return parsed.success ? [parsed.data] : []
  })
}

/** The first problem with a lesson, in words a professor understands. */
export function firstProblem(lesson: unknown): string | null {
  const r = ModelLessonSchema.safeParse(lesson)
  if (r.success) return null
  const issue = r.error.issues[0]
  const block = issue.path[0] === "blocks" && typeof issue.path[1] === "number" ? `Block ${issue.path[1] + 1}: ` : ""
  return `${block}${issue.message.startsWith("Too") || issue.message.startsWith("Invalid") ? "check this block." : issue.message}`
}
