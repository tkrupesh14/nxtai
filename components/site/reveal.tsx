"use client"

import { useEffect, useRef, type ReactNode } from "react"

import { cn } from "@/lib/utils"

// Fade/slide-up on first scroll into view (same thresholds as nxtai.in).
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el.classList.remove("reveal-up")
      el.classList.add("is-visible")
      return
    }
    let timeout: ReturnType<typeof setTimeout> | undefined
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            timeout = setTimeout(() => el.classList.add("is-visible"), delay)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    )
    el.classList.add("reveal-up")
    observer.observe(el)
    return () => {
      if (timeout) clearTimeout(timeout)
      observer.disconnect()
    }
  }, [delay])

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  )
}
