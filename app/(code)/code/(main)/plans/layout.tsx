import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** Study plans: approved beta testers only (closed beta, plan.md "Closed beta"). */
export default async function PlansBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/code/plans")
  return children
}
