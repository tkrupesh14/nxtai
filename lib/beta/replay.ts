import Clarity from "@microsoft/clarity"

import type { FeedbackSite } from "@/lib/feedback/options"

// Session replay for beta testers (closed beta B.4) with Microsoft Clarity. Started by the activity tracker
// (components/beta/activity-tracker.tsx) only for accounts the database tracks: approved testers who agreed, while the
// beta is closed. Everything on the page is masked (text, images, inputs), never on the pages below, and the session
// carries an anonymous tester code (lib/beta/tester-code.ts), never a name or email. Privacy page "Beta testing".

const PROJECT = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? ""

/** No recordings here: account and payments, admin, the professor portal and sign-in pages. */
const PRIVATE = /^\/(account|admin|teach|login|create-account|forgot-password|reset-password|auth)(\/|$)/

let state: "off" | "on" | "stopped" = "off"

export const replayAllowed = (path: string) => Boolean(PROJECT) && !PRIVATE.test(path)

/** Starts recording this page load (once). */
export function startReplay(site: FeedbackSite, code: string) {
  if (state !== "off" || !replayAllowed(window.location.pathname)) return
  state = "on"
  // Mask everything, whatever the project's dashboard setting says.
  document.body.setAttribute("data-clarity-mask", "true")
  Clarity.init(PROJECT)
  Clarity.identify(code, undefined, undefined, code)
  Clarity.setTag("tester", code)
  Clarity.setTag("site", site)
}

/** Stops recording for the rest of this page load (e.g. the tester opened their account page). */
export function stopReplay() {
  if (state !== "on") return
  state = "stopped"
  ;(window as { clarity?: (cmd: string) => void }).clarity?.("stop")
}
