import { notFound, redirect } from "next/navigation"

import { codeLinks } from "@/lib/code/host"
import { problemBySlug } from "@/lib/code/problems"

type Props = { params: Promise<{ slug: string }> }

export default async function ProblemCommunity({ params }: Props) {
  const { slug } = await params
  if (!problemBySlug(slug)) notFound()
  redirect((await codeLinks()).community(`/p/${slug}/solutions`))
}
