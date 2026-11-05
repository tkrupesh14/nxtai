"use client"

import { ErrorScreen } from "@/components/site/error-screen"

// Runtime error boundary for the public pages (and the offline page when the connection dropped).
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen reset={reset} />
}
