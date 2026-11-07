import type { Instrumentation } from "next"

export async function register() {
  // Pushes, notification emails and reminders (lib/background-jobs.ts). Never in dev or tests, nor in a
  // second production server started with KRPEX_NO_JOBS=1 (e.g. a preview next to the live site).
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production" || process.env.KRPEX_NO_JOBS) return
  const { startBackgroundJobs } = await import("@/lib/background-jobs")
  startBackgroundJobs()
}

// Every server-side error in a page, route or server action is recorded for /admin.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const err = error as Error & { digest?: string }
  const message = err?.message || String(error)
  // Bots sending junk server-action IDs are noise, not bugs.
  if (/Server Reference ID|failed-to-find-server-action/i.test(message)) return
  const { logError } = await import("@/lib/error-log")
  logError(
    "server",
    message,
    `${request.method} ${request.path}`,
    [`${context.routeType} ${context.routePath}`, err?.digest ? `digest ${err.digest}` : "", err?.stack?.split("\n").slice(0, 8).join("\n") ?? ""]
      .filter(Boolean)
      .join("\n"),
  )
}
