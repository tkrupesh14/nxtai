import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicProfile } from "@/components/teach/public-profile"
import { isUuid } from "@/lib/learning/data"
import { getLiveProfessor } from "@/lib/teach/teacher"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const p = isUuid(id) ? await getLiveProfessor(id) : null
  if (!p) return { title: "Professor not found — Krpex" }
  return { title: `${p.display_name} (AI) — Krpex`, description: `Learn with an AI that teaches from ${p.display_name}'s own material.` }
}

export default async function ProfessorPage({ params }: Props) {
  const { id } = await params
  const professor = isUuid(id) ? await getLiveProfessor(id) : null
  if (!professor) notFound()
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <PublicProfile professor={professor} />
    </main>
  )
}
