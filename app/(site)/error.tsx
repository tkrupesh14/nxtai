"use client"

import { Button } from "@/components/site/ui/button"

// Runtime error boundary for the public pages.
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">An unexpected error happened while loading this page.</p>
      <div className="mt-8 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
