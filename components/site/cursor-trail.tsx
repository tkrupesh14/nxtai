"use client"

import { useEffect, useRef } from "react"

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }

// Mouse-follow particle trail from nxtai.in. Disabled for reduced motion and touch (coarse pointer) devices.
export function CursorTrail() {
  const frame = useRef<number | null>(null)
  const particles = useRef<Particle[]>([])
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const coarse = window.matchMedia?.("(pointer: coarse)").matches
    if (reduce || coarse) return

    const canvas = document.createElement("canvas")
    canvas.className = "pointer-events-none fixed inset-0 z-50"
    document.body.appendChild(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const resize = () => {
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const styles = getComputedStyle(document.documentElement)
    const colors = [
      (styles.getPropertyValue("--color-primary") || "#2563eb").trim(),
      (styles.getPropertyValue("--color-accent") || "#0ea5e9").trim(),
    ]
    const pick = () => colors[Math.floor(Math.random() * colors.length)]

    const onMove = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY
      const prev = last.current
      last.current = { x, y }
      for (let i = 0; i < 2; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.6 + 0.6 * Math.random()
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: pick(),
          size: 2 + 2 * Math.random(),
        })
      }
      if (prev) {
        const dx = x - prev.x
        const dy = y - prev.y
        const steps = Math.min(8, Math.floor(Math.hypot(dx, dy) / 10))
        for (let i = 0; i < steps; i++) {
          const t = i / steps
          particles.current.push({
            x: prev.x + dx * t,
            y: prev.y + dy * t,
            vx: -(0.02 * dy),
            vy: 0.02 * dx,
            life: 0.8,
            color: pick(),
            size: 1.5,
          })
        }
      }
    }
    window.addEventListener("mousemove", onMove)

    const draw = () => {
      const { innerWidth: w, innerHeight: h } = window
      ctx.clearRect(0, 0, w, h)
      particles.current = particles.current
        .map((p) => {
          p.x += p.vx
          p.y += p.vy
          p.life -= 0.02
          return p
        })
        .filter((p) => p.life > 0)
      for (const p of particles.current) {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI)
        ctx.fill()
      }
      frame.current = requestAnimationFrame(draw)
    }
    frame.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("resize", resize)
      if (frame.current) cancelAnimationFrame(frame.current)
      canvas.remove()
    }
  }, [])

  return null
}
