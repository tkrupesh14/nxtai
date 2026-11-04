import Link from "next/link"
import { notFound } from "next/navigation"

import { TranscriptEditor } from "@/components/teach/transcript-editor"
import { isUuid } from "@/lib/learning/data"
import { getMyProfessor, getMyRecording } from "@/lib/teach/data"
import { clock } from "@/lib/teach/recordings"
import { languageName } from "@/lib/teach/subjects"

export const metadata = { title: "Lecture transcript — Krpex" }

export default async function RecordingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const [professor, rec] = await Promise.all([getMyProfessor(), getMyRecording(id)])
  if (!professor || !rec || !rec.transcript || (rec.status !== "ready" && rec.status !== "added")) notFound()
  const editable = rec.status === "ready" && professor.status !== "suspended"
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-10 md:py-14 [&>*]:min-w-0">
      <div>
        <Link href="/teach" className="text-sm text-muted-foreground hover:text-foreground">
          ← Teaching
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">
          Lecture transcript · {languageName(rec.language)} · {clock(rec.seconds)}
          {rec.topic ? ` · ${rec.topic}` : ""}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">{rec.title}</h1>
        <p className="mt-3 rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {rec.status === "added"
            ? "This transcript is in your material. To stop the AI using it, remove it from your material on the Teaching page."
            : "Speech-to-text gets some words wrong, especially formulas and names. Read it through, fix what's wrong, then add it to your material. The recording itself wasn't kept."}
        </p>
      </div>
      <TranscriptEditor id={rec.id} initial={rec.transcript} editable={editable} />
    </main>
  )
}
