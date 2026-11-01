"use server"

import { revalidatePath } from "next/cache"

import { AIError, generateLesson } from "@/lib/ai/llm"
import { isUuid } from "@/lib/learning/data"
import { prepareLessonGeneration, releaseLesson, saveLesson } from "@/lib/learning/lesson-gen"
import { createClient } from "@/lib/supabase/server"

export type GenerateResult = { status: "ready" } | { status: "pending" } | { status: "error"; message: string }

/** Generate the lesson body + quiz the first time it is opened (non-streaming fallback; see /api/lessons/stream). */
export async function generateLessonAction(courseId: string, lessonId: string): Promise<GenerateResult> {
  const prep = await prepareLessonGeneration(courseId, lessonId)
  if (prep.status !== "claimed") return prep
  try {
    const content = await generateLesson(prep.args)
    await saveLesson(prep.supabase, lessonId, prep.claimedAt, content)
    revalidatePath(`/learn/${courseId}/${lessonId}`)
    return { status: "ready" }
  } catch (e) {
    console.error("lesson generation failed:", e instanceof Error ? e.message : e)
    await releaseLesson(prep.supabase, lessonId, prep.claimedAt)
    return { status: "error", message: e instanceof AIError ? e.userMessage : "We couldn't create this lesson. Please try again." }
  }
}

export type QuizResult = {
  score: number
  passed: boolean
  results: { correct: boolean; answerIndex: number; explanation: string }[]
  nextLessonId: string | null
}

export async function submitQuiz(courseId: string, lessonId: string, answers: number[]): Promise<QuizResult | { error: string }> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: "Lesson not found." }
  if (!Array.isArray(answers) || answers.length > 20 || !answers.every((a) => Number.isInteger(a) && a >= 0 && a < 10)) {
    return { error: "Please answer every question." }
  }
  const supabase = await createClient()
  // Graded in the database (migration 008): the browser never sees the answers before submitting.
  const { data, error } = await supabase.rpc("submit_quiz", { p_lesson: lessonId, p_answers: answers })
  if (error || !data) {
    console.error("submit_quiz failed:", error?.message)
    return { error: "We couldn't save your result. Please try again." }
  }
  const result = data as QuizResult | { error: string }
  revalidatePath(`/learn/${courseId}`)
  return result
}
