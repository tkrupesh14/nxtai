"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface AuthIllustrationProps {
  type: "login" | "signup"
}

export default function AuthIllustration({ type }: AuthIllustrationProps) {
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

    // Animation variables
    const particles: {
      x: number
      y: number
      radius: number
      color: string
      velocity: { x: number; y: number }
      alpha: number
      alphaSpeed: number
    }[] = []

    const colors =
      type === "login"
        ? ["rgba(139, 92, 246, ", "rgba(16, 185, 129, ", "rgba(244, 63, 94, "] // violet, emerald, rose
        : ["rgba(16, 185, 129, ", "rgba(139, 92, 246, ", "rgba(244, 63, 94, "] // emerald, violet, rose

    // Create particles
    const createParticles = () => {
      const particleCount = 50
      const rect = canvas.getBoundingClientRect()

      for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 3 + 1
        const x = Math.random() * rect.width
        const y = Math.random() * rect.height
        const color = colors[Math.floor(Math.random() * colors.length)]
        const velocity = {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.5,
        }
        const alpha = Math.random() * 0.5 + 0.1
        const alphaSpeed = Math.random() * 0.01 + 0.005

        particles.push({
          x,
          y,
          radius,
          color,
          velocity,
          alpha,
          alphaSpeed,
        })
      }
    }

    createParticles()

    // Draw function
    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Draw particles
      particles.forEach((particle) => {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${particle.color}${particle.alpha})`
        ctx.fill()

        // Update position
        particle.x += particle.velocity.x
        particle.y += particle.velocity.y

        // Bounce off edges
        if (particle.x + particle.radius > rect.width || particle.x - particle.radius < 0) {
          particle.velocity.x = -particle.velocity.x
        }

        if (particle.y + particle.radius > rect.height || particle.y - particle.radius < 0) {
          particle.velocity.y = -particle.velocity.y
        }

        // Pulsate alpha
        particle.alpha += particle.alphaSpeed
        if (particle.alpha > 0.6 || particle.alpha < 0.1) {
          particle.alphaSpeed = -particle.alphaSpeed
        }
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            ctx.beginPath()
            ctx.strokeStyle = `${particles[i].color}${(1 - distance / 100) * 0.2})`
            ctx.lineWidth = 0.5
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(draw)
    }

    // Start animation
    draw()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
    }
  }, [type])

  // Draw the main illustration shape based on type
  const IllustrationShape = () => {
    if (type === "login") {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-violet-900/20 rounded-full blur-3xl"></div>
          <motion.div
            className="relative z-10 bg-zinc-800/80 backdrop-blur-sm p-8 rounded-2xl border border-zinc-700 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <div className="w-64 h-64 flex flex-col items-center justify-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 mb-6 relative overflow-hidden"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
              >
                <motion.div
                  className="absolute inset-3 bg-zinc-900 rounded-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <motion.div
                    className="text-violet-400 text-4xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.5, type: "spring" }}
                  >
                    N
                  </motion.div>
                </motion.div>
              </motion.div>
              <motion.h3
                className="text-xl font-bold mb-2 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                Welcome Back
              </motion.h3>
              <motion.p
                className="text-zinc-400 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                Access your NxtAI account and continue your prompt engineering journey
              </motion.p>
            </div>
          </motion.div>
        </div>
      )
    } else {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute w-64 h-64 bg-emerald-900/20 rounded-full blur-3xl"></div>
          <motion.div
            className="relative z-10 bg-zinc-800/80 backdrop-blur-sm p-8 rounded-2xl border border-zinc-700 shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <div className="w-64 h-64 flex flex-col items-center justify-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 mb-6 relative overflow-hidden"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
              >
                <motion.div
                  className="absolute inset-3 bg-zinc-900 rounded-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <motion.div
                    className="text-emerald-400 text-4xl font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, duration: 0.5, type: "spring" }}
                  >
                    N
                  </motion.div>
                </motion.div>
              </motion.div>
              <motion.h3
                className="text-xl font-bold mb-2 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                Join NxtAI
              </motion.h3>
              <motion.p
                className="text-zinc-400 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                Create your account and start your journey to mastering prompt engineering
              </motion.p>
            </div>
          </motion.div>
        </div>
      )
    }
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-zinc-800">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <IllustrationShape />
    </div>
  )
}

