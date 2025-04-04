"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface FloatingParticlesProps {
  count?: number
  color?: "violet" | "emerald" | "rose" | "amber"
}

interface Particle {
  id: number
  size: number
  x: number
  y: number
  duration: number
  delay: number
}

export default function FloatingParticles({ count = 10, color = "violet" }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    const generatedParticles = Array.from({ length: count }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }))
    setParticles(generatedParticles)
  }, [count])

  const getColor = () => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500"
      case "violet":
        return "bg-violet-500"
      case "rose":
        return "bg-rose-500"
      case "amber":
        return "bg-amber-500"
      default:
        return "bg-violet-500"
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className={`absolute rounded-full ${getColor()} opacity-20 blur-sm`}
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
            y: [Math.random() * 100 - 50, Math.random() * 100 - 50],
            opacity: [0.1, 0.3, 0.2, 0.1],
            scale: [1, 1.5, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Number.POSITIVE_INFINITY,
            delay: particle.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}
