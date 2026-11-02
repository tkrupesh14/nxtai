"use server"

import { revalidatePath } from "next/cache"

import { prepareAssessment, type PrepareResult } from "@/lib/learning/assessments"
import { isUuid } from "@/lib/learning/data"
import { createClient } from "@/lib/supabase/server"

/** Write the module test (moduleId) or final exam (null) the first time it is opened. */
export async function prepareAssessmentAction(courseId: string, moduleId: string | null): Promise<PrepareResult> {
  const result = await prepareAssessment(courseId, moduleId)
  if (result.status === "ready") revalidatePath(`/learn/${courseId}`, "layout")
  return result
}

export type AssessmentResult = {
  score: number
  passed: boolean
  /** By original question index. answerIndex and explanation only once the test is passed. */
  results: { i: number; correct: boolean; answerIndex?: number; explanation?: string }[]
  retryAt: string | null
  finalUnlocked: boolean
}

/** answers[k] = chosen original option index for original question k. Graded in the database. */
export async function submitAssessmentAction(
  courseId: string,
  assessmentId: string,
  answers: number[],
): Promise<AssessmentResult | { error: string; retryAt?: string }> {
  if (!isUuid(courseId) || !isUuid(assessmentId)) return { error: "Test not found." }
  if (!Array.isArray(answers) || answers.length > 30 || !answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4)) {
    return { error: "Please answer every question." }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("submit_assessment", { p_assessment: assessmentId, p_answers: answers })
  if (error || !data) {
    console.error("submit_assessment failed:", error?.message)
    return { error: "We couldn't save your result. Please try again." }
  }
  const result = data as AssessmentResult | { error: string; retryAt?: string }
  revalidatePath(`/learn/${courseId}`, "layout")
  revalidatePath("/learn")
  if ("error" in result && result.error === "wait") {
    return { error: "You can't retake this test yet.", retryAt: result.retryAt }
  }
  return result
}

const CERT_ERRORS: Record<string, string> = {
  not_passed: "Pass the final exam first.",
  pro_only: "Certificates are part of Pro.",
  bad_name: "Enter your name as it should appear (2–80 letters, no symbols like < > / @).",
}

/** Claim the certificate for a course whose final exam is passed (Pro only). */
export async function issueCertificateAction(courseId: string, name: string): Promise<{ code: string } | { error: string }> {
  if (!isUuid(courseId) || typeof name !== "string") return { error: "Course not found." }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("issue_certificate", { p_course: courseId, p_name: name.slice(0, 200) })
  if (error || !data) {
    console.error("issue_certificate failed:", error?.message)
    return { error: "We couldn't issue your certificate. Please try again." }
  }
  const r = data as { code?: string; error?: string }
  if (r.code) {
    revalidatePath(`/learn/${courseId}`, "layout")
    revalidatePath("/account")
    return { code: r.code }
  }
  return { error: CERT_ERRORS[r.error ?? ""] ?? "We couldn't issue your certificate. Please try again." }
}
