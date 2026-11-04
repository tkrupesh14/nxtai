import "server-only"

import type { generateLesson } from "@/lib/ai/llm"
import { getCourse, isUnlocked, isUuid } from "@/lib/learning/data"
import type { LessonContent } from "@/lib/learning/schemas"
import { getSections } from "@/lib/sources/data"
import { sourceExcerpt } from "@/lib/sources/sections"
import { createClient } from "@/lib/supabase/server"
import { serverKey } from "@/lib/supabase/server-key"
import { getTeacherContext } from "@/lib/teach/teacher"
import { searchQuery } from "@/lib/teach/teaching"

type Supabase = Awaited<ReturnType<typeof createClient>>
export type LessonArgs = Parameters<typeof generateLesson>[0]

export type Prepared =
  | { status: "ready" }
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "claimed"; claimedAt: string; args: LessonArgs; supabase: Supabase }

/** Check access, claim the lesson for generation (server-only RPC) and build the AI prompt inputs. */
export async function prepareLessonGeneration(courseId: string, lessonId: string): Promise<Prepared> {
  if (!isUuid(courseId) || !isUuid(lessonId)) return { status: "error", message: "Lesson not found." }
  const supabase = await createClient()
  const data = await getCourse(courseId)
  if (!data) return { status: "error", message: "Course not found." }
  const index = data.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) return { status: "error", message: "Lesson not found." }
  if (!isUnlocked(data.lessons, index)) return { status: "error", message: "Finish the previous lesson first." }

  const { data: claim, error: claimError } = await supabase
    .rpc("app_claim_lesson", { p_key: serverKey(), p_lesson: lessonId })
    .single<{ status: string; claimed_at: string | null }>()
  if (claimError || !claim) {
    console.error("app_claim_lesson failed:", claimError?.message)
    return { status: "error", message: "We couldn't open this lesson. Please try again." }
  }
  if (claim.status === "ready") return { status: "ready" }
  if (claim.status === "pending") return { status: "pending" }
  if (claim.status === "locked") return { status: "error", message: "Finish the previous lesson first." }
  if (claim.status !== "claimed" || !claim.claimed_at) return { status: "error", message: "Lesson not found." }

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
  const [{ data: profile }, sources, teacher] = await Promise.all([
    supabase.from("learner_profiles").select("learning_style, background").maybeSingle(),
    getSections(courseId, lesson.source_sections ?? []),
    getTeacherContext(data.course.professor, searchQuery(lesson.title, lesson.objective, mod?.title), 12000),
  ])

  return {
    status: "claimed",
    claimedAt: claim.claimed_at,
    supabase,
    args: {
      categoryId: data.course.category,
      background: profile?.background,
      previousLessonTitle: index > 0 ? data.lessons[index - 1].title : null,
      courseTitle: data.course.title,
      courseLevel: data.course.level,
      goal: data.course.goal,
      outline,
      moduleTitle: mod?.title ?? "",
      lessonTitle: lesson.title,
      objective: lesson.objective,
      estMinutes: lesson.est_minutes,
      learningStyle: profile?.learning_style,
      sourceText: sources.length ? sourceExcerpt(sources, 40000) : null,
      teacher,
    },
  }
}

/** Save generated content for a claimed lesson. Throws if the claim was lost. */
export async function saveLesson(supabase: Supabase, lessonId: string, claimedAt: string, content: LessonContent) {
  const { data: saved, error } = await supabase.rpc("app_save_lesson", {
    p_key: serverKey(),
    p_lesson: lessonId,
    p_claimed_at: claimedAt,
    p_blocks: content.blocks,
    p_takeaways: content.key_takeaways,
    p_quiz: content.quiz,
  })
  if (error) throw error
  if (!saved) throw new Error("lesson claim was lost before saving")
}

/** Give up the claim after a failure so the learner can retry. */
export async function releaseLesson(supabase: Supabase, lessonId: string, claimedAt: string) {
  await supabase.rpc("app_release_lesson", { p_key: serverKey(), p_lesson: lessonId, p_claimed_at: claimedAt })
}
