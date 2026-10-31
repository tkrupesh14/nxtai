"use client"

import { useMemo } from "react"

import { cn } from "@/lib/utils"

export function BackgroundEffects() {
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  )

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div
        className={cn(
          "absolute left-[8%] top-[10%] h-72 w-72 rounded-full blur-3xl opacity-20",
          reduceMotion ? "" : "animate-slow-float"
        )}
        style={{ background: "color-mix(in oklch, var(--color-primary) 60%, transparent)" }}
      />
      <div
        className={cn(
          "absolute right-[12%] top-[25%] h-80 w-80 rounded-full blur-3xl opacity-15",
          reduceMotion ? "" : "animate-slower-float"
        )}
        style={{ background: "color-mix(in oklch, var(--color-accent) 50%, transparent)" }}
      />
      <div
        className={cn(
          "absolute bottom-[8%] left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-10",
          reduceMotion ? "" : "animate-slow-float"
        )}
        style={{ background: "color-mix(in oklch, var(--color-primary) 40%, transparent)" }}
      />
    </div>
  )
}
