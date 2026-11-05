/**
 * Question banks and the professor inbox (8.4 part 2). Pure and client-safe; database calls are in data.ts,
 * teacher.ts and the /teach actions.
 */
import { z } from "zod"

export type BankQuestion = {
  id: string
  topic: string | null
  language: "en" | "hi"
  question: string
  options: string[]
  answer_index: number
  explanation: string | null
  status: "draft" | "published"
  updated_at: string
}

export const BankQuestionSchema = z.object({
  topic: z.string().trim().max(120, "Keep the topic under 120 characters.").optional().default(""),
  language: z.enum(["en", "hi"]),
  question: z.string().trim().min(5, "Write the question (at least 5 characters).").max(1000, "Keep the question under 1000 characters."),
  options: z
    .array(z.string().trim().min(1, "Fill in all four options.").max(300, "Keep each option under 300 characters."))
    .length(4, "Give exactly four options."),
  answer_index: z.coerce.number().int().min(0, "Choose the correct option.").max(3, "Choose the correct option."),
  explanation: z.string().trim().max(1000, "Keep the explanation under 1000 characters.").optional().default(""),
})
export type BankQuestionInput = z.infer<typeof BankQuestionSchema>

/** Up to half of a module test or final exam comes from the professor's bank. */
export const bankShare = (count: number) => Math.floor(count / 2)

export type InboxItem = {
  id: string
  lesson_title: string
  question: string
  ai_reply: string
  note: string | null
  status: "open" | "answered" | "confirmed"
  professor_reply: string | null
  replied_at: string | null
  created_at: string
}

/** Learners can send this many AI answers a day to the real professor (keep in sync with migration 022). */
export const FLAGS_PER_DAY = 3

export const FLAG_ERRORS: Record<string, string> = {
  already_sent: "You've already sent this answer to your professor.",
  flag_limit: `You can send up to ${FLAGS_PER_DAY} answers a day to your professor. Try again tomorrow.`,
  not_professor_course: "This course isn't taught by a real professor's AI version right now.",
  not_found: "That answer can't be sent.",
}
