"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

// Same behaviour as nxtai.in: stored preference in localStorage("theme"), else the OS preference.
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme")
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setIsDark(stored ? stored === "dark" : prefersDark)
    } catch {
      setIsDark(false)
    }
  }, [])

  useEffect(() => {
    if (isDark === null) return
    document.documentElement.classList.toggle("dark", isDark)
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light")
    } catch {}
  }, [isDark])

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setIsDark((v) => !v)}
      className={cn("rounded-full", className)}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn("h-5 w-5 transition-all", isDark ? "opacity-0 scale-75" : "opacity-100 scale-100")}
      >
        <circle cx="12" cy="12" r="5" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
          <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
          <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
          <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
          <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
        </g>
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={cn("absolute h-5 w-5 transition-all", isDark ? "opacity-100 scale-100" : "opacity-0 scale-75")}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" fill="currentColor" />
      </svg>
      <span className="sr-only">{isDark ? "Switch to light mode" : "Switch to dark mode"}</span>
    </Button>
  )
}
