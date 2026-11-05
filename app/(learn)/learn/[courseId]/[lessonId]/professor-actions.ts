"use server"

import { AIError, askProfessor, PRICE_PER_M } from "@/lib/ai/llm"
import { courseLanguage } from "@/lib/learning/language"
import { getCourse, isUnlocked, isUuid } from "@/lib/learning/data"
import { gradedQuestionsText, HINT_FALLBACK, matchesGraded, revealsAnswer, type GradedQuestion } from "@/lib/learning/graded"
import { getSections } from "@/lib/sources/data"
import { sourceExcerpt } from "@/lib/sources/sections"
import {
  ASK_LIMITS,
  LIMIT_MESSAGES,
  QUICK_KINDS,
  isQuickKind,
  normalizeQuestion,
  type AskResult,
  type ChatTurn,
} from "@/lib/learning/professor"
import type { LessonBlock } from "@/lib/learning/schemas"
import { sectionLabel, sectionText, toSections } from "@/lib/learning/sections"
import { createClient } from "@/lib/supabase/server"
import { getTeacherContext } from "@/lib/teach/teacher"
import { searchQuery } from "@/lib/teach/teaching"

const DAILY_BUDGET_USD = Number(process.env.PROFESSOR_DAILY_BUDGET_USD || 2)

/**
 * Ask the lesson's professor. Order matters for cost: cheap checks and caches first,
 * then the global spend cap, then the per-user credit (atomic, in Postgres), then the AI call.
 */
export async function askProfessorAction(
  courseId: string,
  lessonId: string,
  input: { kind: string; section: number; question?: string },
): Promise<AskResult> {
  if (process.env.PROFESSOR_CHAT === "off") return { ok: false, message: "Ask the professor is paused right now." }
  if (!isUuid(courseId) || !isUuid(lessonId)) return { ok: false, message: LIMIT_MESSAGES.not_found }

  const kind = input.kind === "ask" ? "ask" : isQuickKind(input.kind) ? input.kind : null
  const section = Number.isInteger(input.section) ? input.section : -1
  if (!kind || section < -1 || section > 100) return { ok: false, message: "Something went wrong. Please reload." }

  let question: string
  if (kind === "ask") {
    question = (input.question ?? "").replace(/\s+/g, " ").trim()
    if (question.length < 3) return { ok: false, message: "Type a question first." }
    if (question.length > ASK_LIMITS.maxQuestionChars) {
      return { ok: false, message: `Please keep it under ${ASK_LIMITS.maxQuestionChars} characters.` }
    }
    if (!/[\p{L}\p{N}]{2,}/u.test(question)) return { ok: false, message: "That doesn't look like a question." }
  } else {
    if (section < 0) return { ok: false, message: "Pick a section first." }
    question = QUICK_KINDS[kind].prompt
  }

  const data = await getCourse(courseId)
  if (!data) return { ok: false, message: LIMIT_MESSAGES.not_found }
  const index = data.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0 || !isUnlocked(data.lessons, index)) return { ok: false, message: LIMIT_MESSAGES.not_found }

  const supabase = await createClient()
  const { data: body } = await supabase
    .from("lessons")
    .select("content_md, blocks, key_takeaways")
    .eq("id", lessonId)
    .single()
  const blocks = (body?.blocks ?? null) as LessonBlock[] | null
  if (!blocks?.length && !body?.content_md) return { ok: false, message: "Open the lesson first, then ask." }
  const sections = blocks?.length ? toSections(blocks) : []
  const focus = section >= 0 ? sections[section] : undefined
  if (kind !== "ask" && !focus) return { ok: false, message: "Pick a section first." }

  // Free answers: the same quick button on the same section, or a repeated question.
  const { data: past } = await supabase
    .from("professor_questions")
    .select("id, kind, section, question, reply, verdict, created_at")
    .eq("lesson_id", lessonId)
    .eq("status", "answered")
    .order("created_at", { ascending: false })
    .limit(50)
  const answered = (past ?? []) as (ChatTurn & { created_at: string })[]
  const norm = normalizeQuestion(question)
  const hit = answered.find((t) =>
    kind === "ask"
      ? t.kind === "ask" && t.verdict === "answer" && normalizeQuestion(t.question) === norm
      : t.kind === kind && t.section === section,
  )
  // Old replies that gave a graded answer away (before this was enforced) aren't reused.
  if (hit && !(kind === "ask" && data.lessons[index].completed_at === null && revealsAnswer(hit.reply))) {
    return { ok: true, cached: true, paid: false, turn: { ...hit, question: kind === "ask" ? question : hit.question }, usedToday: -1, usedLesson: -1 }
  }

  // Global safety net across all learners.
  const { data: spend } = await supabase.rpc("professor_tokens_today").single<{ tokens_in: number; tokens_out: number }>()
  const usd = spend ? (Number(spend.tokens_in) * PRICE_PER_M.input + Number(spend.tokens_out) * PRICE_PER_M.output) / 1e6 : 0
  if (usd >= DAILY_BUDGET_USD) {
    console.warn(`professor chat daily budget reached: $${usd.toFixed(3)}`)
    return { ok: false, message: "Your professor has had a very busy day. Please come back tomorrow." }
  }

  const { data: credit, error: creditError } = await supabase
    .rpc("take_question_credit", { p_lesson: lessonId, p_section: section, p_kind: kind, p_question: question })
    .single<{
      question_id: string | null
      reason: string | null
      used_today: number
      used_lesson: number
      paid: boolean
      credits_left: number
    }>()
  if (creditError || !credit) {
    console.error("take_question_credit failed:", creditError?.message)
    return { ok: false, message: "Something went wrong. Please try again." }
  }
  if (!credit.question_id) {
    return {
      ok: false,
      message:
        LIMIT_MESSAGES[kind !== "ask" && credit.reason === "daily_limit" ? "quick_daily_limit" : (credit.reason ?? "")] ??
        "Please try again later.",
      usedToday: credit.used_today,
      usedLesson: kind === "ask" ? credit.used_lesson : undefined,
      credits: credit.credits_left,
    }
  }
  const questionId = credit.question_id

  const lesson = data.lessons[index]
  const outline = sections.length
    ? `Sections: ${sections.map((s) => sectionLabel(s)).join(" · ")}`
    : `Lesson text (start): ${(body?.content_md ?? "").slice(0, 1500)}`
  const takeaways = ((body?.key_takeaways ?? []) as string[]).slice(0, 6)
  const history = answered
    .filter((t) => t.kind === "ask" && t.verdict === "answer")
    .slice(0, 3)
    .reverse()
    .map((t) => ({ question: t.question, reply: t.reply }))
  const [{ data: profile }, sources, { data: quiz }, teacher] = await Promise.all([
    supabase.from("learner_profiles").select("background").maybeSingle(),
    getSections(courseId, lesson.source_sections ?? []),
    supabase.rpc("lesson_quiz_questions", { p_lesson: lessonId }),
    // Small: chat answers are kept cheap.
    getTeacherContext(data.course.professor, searchQuery(question, lesson.title), 4000),
  ])
  // Practice and quiz questions (never their answers), so the professor recognises them when asked.
  const checkpoints: GradedQuestion[] = (blocks ?? []).flatMap((b) =>
    b.checkpoint ? [{ question: b.checkpoint.question, options: b.checkpoint.options }] : [],
  )
  const quizQuestions = ((quiz ?? []) as GradedQuestion[]).filter((q) => typeof q?.question === "string" && Array.isArray(q.options))
  const graded = [...checkpoints, ...quizQuestions]
  const lessonPassed = lesson.completed_at !== null
  const isLessonQuestion = kind === "ask" && matchesGraded(question, graded)

  try {
    const ask = (hintsOnly: boolean) => askProfessor({
      categoryId: data.course.category,
      courseTitle: data.course.title,
      goal: data.course.goal,
      background: profile?.background,
      lessonTitle: lesson.title,
      objective: lesson.objective,
      lessonOutline: `${outline}${takeaways.length ? `\nKey takeaways: ${takeaways.join("; ")}` : ""}`,
      sourceText: sources.length ? sourceExcerpt(sources, 12000) : null,
      sectionText: focus ? `${sectionLabel(focus)}\n${sectionText(focus)}` : null,
      history,
      question,
      gradedQuestions: graded.length ? gradedQuestionsText(checkpoints, quizQuestions) : undefined,
      lessonPassed,
      hintsOnly,
      teacher,
      language: courseLanguage(data.course.language),
    })
    let { reply, usage } = await ask(false)
    // Answers to graded questions stay hidden, except this lesson's own questions once its quiz is passed.
    const mustHide = (r: typeof reply) =>
      (r.graded_question || isLessonQuestion) && !(lessonPassed && isLessonQuestion) && revealsAnswer(r.reply)
    if (mustHide(reply)) {
      const retry = await ask(true)
      usage = { input: usage.input + retry.usage.input, output: usage.output + retry.usage.output }
      reply = mustHide(retry.reply) ? { ...retry.reply, reply: HINT_FALLBACK } : retry.reply
    }
    const text = reply.reply.trim().slice(0, 6000)
    // Only hand the answer over if this pending row is still ours to finish.
    const { data: saved, error } = await supabase
      .from("professor_questions")
      .update({
        reply: text,
        verdict: reply.verdict,
        status: "answered",
        tokens_in: Math.min(usage.input, 20000),
        tokens_out: Math.min(usage.output, 4000),
      })
      .eq("id", questionId)
      .eq("status", "pending")
      .select("id")
    if (error || !saved?.length) throw new Error(`saving reply failed: ${error?.message ?? "row not pending"}`)
    return {
      ok: true,
      cached: false,
      turn: { id: questionId, kind, section, question, reply: text, verdict: reply.verdict },
      usedToday: credit.used_today,
      usedLesson: credit.used_lesson,
      paid: credit.paid,
      credits: credit.credits_left,
    }
  } catch (e) {
    console.error("professor answer failed:", e instanceof Error ? e.message : e)
    await supabase.from("professor_questions").update({ status: "failed" }).eq("id", questionId).eq("status", "pending")
    return {
      ok: false,
      message:
        (e instanceof AIError ? e.userMessage : "Your professor couldn't answer just now. Please try again.") +
        (credit.paid ? " Credits for failed answers are refunded (up to 2 a day)." : ""),
    }
  }
}
