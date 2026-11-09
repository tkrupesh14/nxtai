"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * A draggable divider between two panes. `size` is the first pane's share of the container in percent, kept
 * between min and max and remembered in this browser. Keyboard: arrow keys move it by 2%.
 */
export function useSplit(key: string, initial: number, min: number, max: number, axis: "x" | "y") {
  const [size, setSize] = useState(initial)
  const container = useRef<HTMLDivElement | null>(null)
  const clamp = useCallback((v: number) => Math.min(max, Math.max(min, v)), [min, max])

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(key))
      if (saved) setSize(clamp(saved))
    } catch {}
  }, [key, clamp])

  const save = useCallback(
    (v: number) => {
      try {
        localStorage.setItem(key, String(Math.round(v * 10) / 10))
      } catch {}
    },
    [key],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = container.current
      if (!el) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      let last = size
      const move = (ev: PointerEvent) => {
        const pct = axis === "x" ? ((ev.clientX - rect.left) / rect.width) * 100 : ((ev.clientY - rect.top) / rect.height) * 100
        last = clamp(pct)
        setSize(last)
      }
      const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        save(last)
      }
      document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize"
      document.body.style.userSelect = "none"
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
    },
    [axis, clamp, save, size],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const dir = axis === "x" ? { ArrowLeft: -2, ArrowRight: 2 } : { ArrowUp: -2, ArrowDown: 2 }
      const d = dir[e.key as keyof typeof dir]
      if (!d) return
      e.preventDefault()
      const v = clamp(size + d)
      setSize(v)
      save(v)
    },
    [axis, clamp, save, size],
  )

  const handleProps = {
    role: "separator" as const,
    tabIndex: 0,
    "aria-orientation": (axis === "x" ? "vertical" : "horizontal") as "vertical" | "horizontal",
    "aria-valuenow": Math.round(size),
    "aria-valuemin": min,
    "aria-valuemax": max,
    onPointerDown,
    onKeyDown,
  }
  return { size, container, handleProps }
}
