"use server"

import { revalidatePath } from "next/cache"

import { AIError, generateLesson } from "@/lib/ai/llm"
import { getCourse, isUnlocked, isUuid } from "@/lib/learning/data"
import { PASS_MARK, type QuizQuestion } from "@/lib/learning/schemas"
import { createClient } from "@/lib/supabase/server"

export type GenerateResult = { status: "ready" } | { status: "pending" } | { status: "error"; message: string }

const STALE_CLAIM_MS = 4 * 60 * 1000


/** Generate the lesson body + quiz the first time it is opened. Safe against double clicks / two tabs. */
export async function generateLessonAction(courseId: string, lessonId: string): Promise<GenerateResult> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { status: "error", message: "Lesson not found." }
  const supabase = await createClient()
  const data = await getCourse(courseId)
  if (!data) return { status: "error", message: "Course not found." }
  const index = data.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) return { status: "error", message: "Lesson not found." }
  if (!isUnlocked(data.lessons, index)) return { status: "error", message: "Finish the previous lesson first." }

  const { data: current } = await supabase.from("lessons").select("content_md, generated_at").eq("id", lessonId).single()
  if (current?.content_md) return { status: "ready" }

  // Claim the generation so only one request calls the AI.
  const claimedAt = new Date().toISOString()
  let claim = supabase.from("lessons").update({ generated_at: claimedAt }).eq("id", lessonId).is("content_md", null)
  if (current?.generated_at) {
    if (Date.now() - new Date(current.generated_at).getTime() < STALE_CLAIM_MS) return { status: "pending" }
    claim = claim.eq("generated_at", current.generated_at) // take over a stale claim
  } else {
    claim = claim.is("generated_at", null)
  }
  const { data: claimed } = await claim.select("id")
  if (!claimed?.length) return { status: "pending" }

  const lesson = data.lessons[index]
  const mod = data.modules.find((m) => m.id === lesson.module_id)
  const outline = data.modules
    .map((m) => {
      const items = data.lessons
        .filter((l) => l.module_id === m.id)
        .map((l) => `${l.id === lessonId ? "  » " : "  - "}${l.title}`)
        .join("\n")
      return `Module ${m.position + 1}: ${m.title}\n${items}`
    })
    .join("\n")
  const { data: profile } = await supabase.from("learner_profiles").select("learning_style").maybeSingle()

  try {
    const content = await generateLesson({
      courseTitle: data.course.title,
      courseLevel: data.course.level,
      goal: data.course.goal,
      outline,
      moduleTitle: mod?.title ?? "",
      lessonTitle: lesson.title,
      objective: lesson.objective,
      estMinutes: lesson.est_minutes,
      learningStyle: profile?.learning_style,
    })
    const { error } = await supabase
      .from("lessons")
      .update({
        content_md: content.content_markdown,
        key_takeaways: content.key_takeaways,
        quiz: content.quiz,
        generated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
    if (error) throw error
    revalidatePath(`/learn/${courseId}/${lessonId}`)
    return { status: "ready" }
  } catch (e) {
    console.error("lesson generation failed:", e instanceof Error ? e.message : e)
    await supabase.from("lessons").update({ generated_at: null }).eq("id", lessonId).eq("generated_at", claimedAt)
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
  const supabase = await createClient()
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, position, quiz, best_score, attempts, completed_at")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle()
  const quiz = (lesson?.quiz ?? null) as QuizQuestion[] | null
  if (!lesson || !quiz?.length) return { error: "This quiz isn't available." }
  if (answers.length !== quiz.length) return { error: "Please answer every question." }

  const results = quiz.map((q, i) => ({
    correct: answers[i] === q.answer_index,
    answerIndex: q.answer_index,
    explanation: q.explanation,
  }))
  const score = Math.round((results.filter((r) => r.correct).length / quiz.length) * 100)
  const passed = score >= PASS_MARK

  const { error } = await supabase
    .from("lessons")
    .update({
      attempts: (lesson.attempts ?? 0) + 1,
      best_score: Math.max(score, lesson.best_score ?? 0),
      completed_at: lesson.completed_at ?? (passed ? new Date().toISOString() : null),
    })
    .eq("id", lessonId)
  if (error) {
    console.error("saving quiz result failed:", error.message)
    return { error: "We couldn't save your result. Please try again." }
  }

  const { data: next } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("position", lesson.position + 1)
    .maybeSingle()

  // Mark the course completed when every lesson is done.
  if (passed && !next) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .is("completed_at", null)
    if (count === 0) await supabase.from("courses").update({ status: "completed" }).eq("id", courseId)
  }

  revalidatePath(`/learn/${courseId}`)
  return { score, passed, results, nextLessonId: next?.id ?? null }
}
