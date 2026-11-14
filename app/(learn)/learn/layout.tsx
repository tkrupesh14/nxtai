import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** My courses and lessons: approved beta testers only; signed-out visitors are sent to log in by the pages (closed beta, plan.md "Closed beta"). */
export default async function LearnBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/learn", { signedOut: "allow" })
  return children
}
