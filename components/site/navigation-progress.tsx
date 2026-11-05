"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

/**
 * A thin bar at the top of the page while a link is loading the next page, so a click never looks like nothing
 * happened. Starts on clicks on same-site links and finishes when the URL changes.
 */
function Bar() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [progress, setProgress] = useState<number | null>(null)
  const timers = useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((t) => window.clearInterval(t))
    timers.current = []
  }

  useEffect(() => {
    const start = () => {
      clear()
      setProgress(8)
      // Creep towards 90% until the page arrives; give up after 20 s (a failed navigation).
      timers.current.push(window.setInterval(() => setProgress((p) => (p === null ? p : p + (90 - p) * 0.08)), 200))
      timers.current.push(window.setTimeout(() => (clear(), setProgress(null)), 20000))
    }
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.("a")
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname && url.search === location.search) return // same page or #anchor
      start()
    }
    // Capture phase: next/link calls preventDefault on the click before it would bubble up to us.
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("click", onClick, true)
      clear()
    }
  }, [])

  // The new page is here: fill the bar, then hide it.
  useEffect(() => {
    clear()
    setProgress((p) => (p === null ? null : 100))
    const t = window.setTimeout(() => setProgress(null), 250)
    return () => window.clearTimeout(t)
  }, [pathname, search])

  if (progress === null) return null
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--primary)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  )
}
