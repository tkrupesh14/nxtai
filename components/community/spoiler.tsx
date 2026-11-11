"use client"

import { useState } from "react"

/** Blurs a spoiler until the reader chooses to see it. */
export function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false)
  if (shown) return <>{children}</>
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-md">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <button type="button" onClick={() => setShown(true)} className="rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:border-primary/50">
          Contains a spoiler — show it
        </button>
      </div>
    </div>
  )
}
