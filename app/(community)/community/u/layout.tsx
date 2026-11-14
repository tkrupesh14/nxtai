import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** Public profiles: approved beta testers only (closed beta, plan.md "Closed beta"). */
export default async function ProfilesBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/community")
  return children
}
