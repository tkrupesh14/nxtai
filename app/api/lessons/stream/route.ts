import { revalidatePath } from "next/cache"
import type { NextRequest } from "next/server"

import { AIError, streamLesson } from "@/lib/ai/llm"
import { prepareLessonGeneration, releaseLesson, saveLesson } from "@/lib/learning/lesson-gen"

// Writes a lesson and streams its blocks as newline-delimited JSON while the AI writes them:
//   {"type":"blocks","blocks":[...]}  (all complete blocks so far)
//   {"type":"done"} | {"type":"ready"} | {"type":"pending"} | {"type":"error","message":"..."}
// Generation continues and is saved even if the learner leaves the page.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { courseId?: string; lessonId?: string } | null
  const courseId = String(body?.courseId ?? "")
  const lessonId = String(body?.lessonId ?? "")

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (obj: unknown) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`))
        } catch {
          open = false // client went away; keep generating and saving
        }
      }
      const close = () => {
        if (!open) return
        open = false
        try {
          controller.close()
        } catch {}
      }

      const prep = await prepareLessonGeneration(courseId, lessonId)
      if (prep.status !== "claimed") {
        send(prep.status === "error" ? { type: "error", message: prep.message } : { type: prep.status })
        return close()
      }
      try {
        const content = await streamLesson(prep.args, (blocks) => send({ type: "blocks", blocks }))
        await saveLesson(prep.supabase, lessonId, prep.claimedAt, content)
        revalidatePath(`/learn/${courseId}/${lessonId}`)
        send({ type: "done" })
      } catch (e) {
        console.error("lesson stream failed:", e instanceof Error ? e.message : e)
        await releaseLesson(prep.supabase, lessonId, prep.claimedAt)
        send({
          type: "error",
          message: e instanceof AIError ? e.userMessage : "We couldn't create this lesson. Please try again.",
        })
      }
      close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no", // tell Nginx not to buffer the stream
    },
  })
}
