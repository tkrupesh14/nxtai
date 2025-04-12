"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

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

    // Animation variables
    let animationProgress = 0
    const animationSpeed = 0.02
    let animationFrame: number

    // Draw radar chart with animation
    const drawRadar = () => {
      const rect = canvas.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2
      const radius = Math.min(centerX, centerY) * 0.8

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Draw background circles with glow
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

      // Draw data points and area with animation
      ctx.beginPath()
      skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2
        const pointRadius = radius * skill.value * Math.min(1, animationProgress)

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
      const firstPointRadius = radius * skills[0].value * Math.min(1, animationProgress)
      ctx.lineTo(centerX + Math.cos(firstAngle) * firstPointRadius, centerY + Math.sin(firstAngle) * firstPointRadius)

      // Create gradient fill
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, "rgba(139, 92, 246, 0.3)")
      gradient.addColorStop(1, "rgba(139, 92, 246, 0.05)")

      // Fill area
      ctx.fillStyle = gradient
      ctx.fill()

      // Draw stroke with glow effect
      ctx.shadowColor = "rgba(139, 92, 246, 0.5)"
      ctx.shadowBlur = 10
      ctx.strokeStyle = "rgba(139, 92, 246, 0.8)"
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.shadowBlur = 0

      // Draw data points
      skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2
        const pointRadius = radius * skill.value * Math.min(1, animationProgress)

        const x = centerX + Math.cos(angle) * pointRadius
        const y = centerY + Math.sin(angle) * pointRadius

        // Glow effect
        ctx.shadowColor = skill.color
        ctx.shadowBlur = 10

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = skill.color
        ctx.fill()
        ctx.strokeStyle = "#1f1f23"
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.shadowBlur = 0
      })

      // Update animation
      if (animationProgress < 1) {
        animationProgress += animationSpeed
        animationFrame = requestAnimationFrame(drawRadar)
      }
    }

    // Start animation
    animationFrame = requestAnimationFrame(drawRadar)

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <div className="h-72 flex flex-col">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative w-full h-full"
      >
        <canvas ref={canvasRef} className="w-full h-full" />
      </motion.div>
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
