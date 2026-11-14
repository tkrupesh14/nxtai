import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** Solutions and discussions: approved beta testers only, reading included (closed beta, plan.md "Closed beta"). */
export default async function ProblemPostsBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/community")
  return children
}
