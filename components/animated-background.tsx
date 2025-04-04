"use client"

import { useEffect, useRef } from "react"

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth
      canvas.height = canvas.parentElement?.offsetHeight || 300
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Create grid points
    const gridSize = 30
    const points: { x: number; y: number; vx: number; vy: number; connections: number[] }[] = []

    const initPoints = () => {
      points.length = 0
      const cols = Math.floor(canvas.width / gridSize) + 2
      const rows = Math.floor(canvas.height / gridSize) + 2

      for (let i = 0; i < cols * rows; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)

        points.push({
          x: col * gridSize,
          y: row * gridSize,
          vx: Math.random() * 0.5 - 0.25,
          vy: Math.random() * 0.5 - 0.25,
          connections: [],
        })
      }
    }

    initPoints()
    window.addEventListener("resize", initPoints)

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update points
      for (let i = 0; i < points.length; i++) {
        const point = points[i]

        // Move points
        point.x += point.vx
        point.y += point.vy

        // Bounce off edges
        if (point.x < 0 || point.x > canvas.width) point.vx *= -1
        if (point.y < 0 || point.y > canvas.height) point.vy *= -1

        // Draw points
        ctx.beginPath()
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fill()
      }

      // Draw connections
      for (let i = 0; i < points.length; i++) {
        const pointA = points[i]

        for (let j = i + 1; j < points.length; j++) {
          const pointB = points[j]
          const dx = pointA.x - pointB.x
          const dy = pointA.y - pointB.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < gridSize * 2) {
            ctx.beginPath()
            ctx.moveTo(pointA.x, pointA.y)
            ctx.lineTo(pointB.x, pointB.y)
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / (gridSize * 2))})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      window.removeEventListener("resize", initPoints)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

