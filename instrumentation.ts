import type { Instrumentation } from "next"

export async function register() {}

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
