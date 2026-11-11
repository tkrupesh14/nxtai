import type { Metadata } from "next"

import { BoardGrid } from "@/components/community/board-grid"
import { codeLinks } from "@/lib/code/host"
import { getBoardStats } from "@/lib/community/data"

// Community 5c: every board (community.krpex.in/c).

export const metadata: Metadata = {
  title: "Boards",
  description: "Ask for help, prepare for interviews, show your projects and talk about every Krpex subject.",
}

export default async function BoardsPage() {
  const [links, stats] = await Promise.all([codeLinks(), getBoardStats()])
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-8 md:py-10">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
        <p className="text-sm text-muted-foreground">
          For a coding problem, use its own Discussion — open the problem on{" "}
          <a href={links.code("/problems")} className="font-medium text-primary hover:underline">
            Krpex Code
          </a>
          .
        </p>
      </header>
      <BoardGrid kind="general" heading="General" stats={stats} community={links.community} />
      <BoardGrid kind="course" heading="Course subjects" stats={stats} community={links.community} />
    </main>
  )
}
