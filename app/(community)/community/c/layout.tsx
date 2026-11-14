import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** Boards and their threads: approved beta testers only, reading included (closed beta, plan.md "Closed beta"). */
export default async function BoardsBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/community/c")
  return children
}
