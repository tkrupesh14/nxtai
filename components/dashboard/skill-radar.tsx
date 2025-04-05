"use client"

import { useEffect, useRef } from "react"

export default function SkillRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Skill data
    const skills = [
      { name: "Prompt Clarity", value: 0.85, color: "#8b5cf6" },
      { name: "Context Management", value: 0.7, color: "#10b981" },
      { name: "Few-Shot Learning", value: 0.6, color: "#f43f5e" },
      { name: "Chain-of-Thought", value: 0.75, color: "#f59e0b" },
      { name: "Constraint Handling", value: 0.5, color: "#3b82f6" },
    ]

    // Draw radar chart
    const drawRadar = () => {
      const rect = canvas.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const radius = Math.min(centerX, centerY) * 0.8

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Draw background circles
      const levels = 5
      for (let i = 1; i <= levels; i++) {
        const levelRadius = (radius / levels) * i

        ctx.beginPath()
        ctx.arc(centerX, centerY, levelRadius, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
        ctx.stroke()
      }

      // Draw axes
      const angleStep = (Math.PI * 2) / skills.length

      skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2

        // Draw axis line
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
        ctx.stroke()

        // Draw skill label
        const labelX = centerX + Math.cos(angle) * (radius + 15)
        const labelY = centerY + Math.sin(angle) * (radius + 15)

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
        ctx.font = "10px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(skill.name, labelX, labelY)
      })

      // Draw data points and area
      ctx.beginPath()
      skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2
        const pointRadius = radius * skill.value

        const x = centerX + Math.cos(angle) * pointRadius
        const y = centerY + Math.sin(angle) * pointRadius

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      // Close the path
      const firstAngle = -Math.PI / 2
      const firstPointRadius = radius * skills[0].value
      ctx.lineTo(centerX + Math.cos(firstAngle) * firstPointRadius, centerY + Math.sin(firstAngle) * firstPointRadius)

      // Fill area
      ctx.fillStyle = "rgba(139, 92, 246, 0.2)"
      ctx.fill()

      // Draw stroke
      ctx.strokeStyle = "rgba(139, 92, 246, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw data points
      skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2
        const pointRadius = radius * skill.value

        const x = centerX + Math.cos(angle) * pointRadius
        const y = centerY + Math.sin(angle) * pointRadius

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = skill.color
        ctx.fill()
        ctx.strokeStyle = "#1f1f23"
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    drawRadar()
    window.addEventListener("resize", drawRadar)

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      window.removeEventListener("resize", drawRadar)
    }
  }, [])

  return (
    <div className="h-72 flex flex-col">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="flex justify-center mt-2">
        <div className="flex items-center text-xs text-zinc-400">
          <span>Beginner</span>
          <div className="w-24 h-1 mx-2 bg-gradient-to-r from-zinc-700 to-violet-500 rounded-full"></div>
          <span>Expert</span>
        </div>
      </div>
    </div>
  )
}

