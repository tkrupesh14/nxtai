import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** The playground: approved beta testers only (closed beta, plan.md "Closed beta"). */
export default async function PlaygroundBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/code/playground")
  return children
}
