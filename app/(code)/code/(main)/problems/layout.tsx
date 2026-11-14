import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** The problem set: approved beta testers only (closed beta, plan.md "Closed beta"). */
export default async function ProblemsBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/code/problems")
  return children
}
