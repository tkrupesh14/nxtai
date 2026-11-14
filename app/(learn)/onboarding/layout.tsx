import type React from "react"

import { requireBeta } from "@/lib/beta/access"

/** Building a course: approved beta testers only; signed-out visitors are sent to log in by the page (closed beta, plan.md "Closed beta"). */
export default async function OnboardingBetaLayout({ children }: { children: React.ReactNode }) {
  await requireBeta("/onboarding", { signedOut: "allow" })
  return children
}
