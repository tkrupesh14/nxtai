import "server-only"

import { cache } from "react"

import { getProfessor, professorForCategory, type Professor } from "@/lib/learning/catalog"
import { createClient } from "@/lib/supabase/server"
import type { QuizQuestion } from "@/lib/learning/schemas"
import { serverKey } from "@/lib/supabase/server-key"
import {
  teacherContext,
  teacherIdOf,
  teacherPersona,
  type PublicProfessor,
  type TeacherContext,
  type TeacherContextRow,
} from "@/lib/teach/teaching"

/** Live professors (optionally for one subject such as "science/physics"), oldest first. */
export const getLiveProfessors = cache(async (subject?: string): Promise<PublicProfessor[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("public_professors", subject ? { p_subject: subject } : {})
  if (error) {
    console.error("public_professors failed:", error.message)
    return []
  }
  return (Array.isArray(data) ? data : []) as PublicProfessor[]
})

export const getLiveProfessor = cache(async (id: string): Promise<PublicProfessor | null> => {
  if (!teacherIdOf(`p:${id}`)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("public_professor", { p_id: id })
  if (error) console.error("public_professor failed:", error.message)
  return (data as PublicProfessor | null) ?? null
})

/**
 * The persona a course is taught by: a live professor's AI version, or the category's AI professor (also when the
 * course's professor has since been paused or hidden).
 */
export async function courseProfessor(course: { professor: string | null; category: string | null }): Promise<Professor> {
  const id = teacherIdOf(course.professor)
  if (id) {
    const live = await getLiveProfessor(id)
    return live ? teacherPersona(live) : professorForCategory(course.category)
  }
  return course.professor ? getProfessor(course.professor) : professorForCategory(course.category)
}

/**
 * What the AI needs to teach as the course's professor, with the material matching `query`. Null for AI personas,
 * professors who aren't live, and on errors (the lesson then uses the AI persona instead of failing).
 */
export async function getTeacherContext(professor: string | null, query: string, maxChars: number): Promise<TeacherContext | null> {
  const id = teacherIdOf(professor)
  if (!id) return null
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("app_teacher_context", {
    p_key: serverKey(),
    p_professor: id,
    p_query: query,
    p_max_chars: maxChars,
  })
  if (error) {
    console.error("app_teacher_context failed:", error.message)
    return null
  }
  return data ? teacherContext(data as TeacherContextRow) : null
}

/**
 * Up to `limit` published questions from the course professor's bank that match `query`, in the course's
 * language (8.4). Empty for AI personas, professors who aren't live, and on errors.
 */
export async function getTeacherQuestions(professor: string | null, query: string, language: "en" | "hi", limit: number): Promise<QuizQuestion[]> {
  const id = teacherIdOf(professor)
  if (!id || limit <= 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("app_teacher_questions", {
    p_key: serverKey(),
    p_professor: id,
    p_query: query,
    p_language: language,
    p_limit: limit,
  })
  if (error) {
    console.error("app_teacher_questions failed:", error.message)
    return []
  }
  return (Array.isArray(data) ? data : []).map((q: QuizQuestion) => ({
    question: q.question,
    options: q.options,
    answer_index: q.answer_index,
    explanation: q.explanation,
  }))
}
