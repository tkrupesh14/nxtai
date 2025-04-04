"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useAnimation } from "framer-motion"
import { Users, BookOpen, Award, Clock } from "lucide-react"

export default function AnimatedStats() {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const controls = useAnimation()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          controls.start("visible")
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [controls])

  const stats = [
    {
      icon: <Users className="h-6 w-6 text-violet-400" />,
      value: 5000,
      label: "Active Learners",
      color: "violet",
    },
    {
      icon: <BookOpen className="h-6 w-6 text-emerald-400" />,
      value: 120,
      label: "Unique Assessments",
      color: "emerald",
    },
    {
      icon: <Award className="h-6 w-6 text-rose-400" />,
      value: 98,
      label: "Success Rate",
      suffix: "%",
      color: "rose",
    },
    {
      icon: <Clock className="h-6 w-6 text-amber-400" />,
      value: 40,
      label: "Avg. Learning Time",
      suffix: "%",
      description: "reduction compared to traditional courses",
      color: "amber",
    },
  ]

  const getGlowColor = (color: string) => {
    switch (color) {
      case "violet":
        return "shadow-violet-500/10"
      case "emerald":
        return "shadow-emerald-500/10"
      case "rose":
        return "shadow-rose-500/10"
      case "amber":
        return "shadow-amber-500/10"
      default:
        return "shadow-violet-500/10"
    }
  }

  const getBorderColor = (color: string) => {
    switch (color) {
      case "violet":
        return "border-violet-800/30"
      case "emerald":
        return "border-emerald-800/30"
      case "rose":
        return "border-rose-800/30"
      case "amber":
        return "border-amber-800/30"
      default:
        return "border-violet-800/30"
    }
  }

  const getTextColor = (color: string) => {
    switch (color) {
      case "violet":
        return "text-violet-400"
      case "emerald":
        return "text-emerald-400"
      case "rose":
        return "text-rose-400"
      case "amber":
        return "text-amber-400"
      default:
        return "text-violet-400"
    }
  }

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial="hidden"
          animate={controls}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={`bg-zinc-800/50 backdrop-blur-sm rounded-xl p-6 border ${getBorderColor(stat.color)} shadow-lg ${getGlowColor(stat.color)}`}
        >
          <div className="flex items-start">
            <div className={`p-3 rounded-lg bg-${stat.color}-900/20 mr-4`}>{stat.icon}</div>
            <div>
              <div className="flex items-baseline">
                <motion.span
                  className={`text-3xl font-bold ${getTextColor(stat.color)}`}
                  initial={{ opacity: 0 }}
                  animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  {isVisible ? <Counter from={0} to={stat.value} duration={2} /> : 0}
                </motion.span>
                {stat.suffix && <span className={`ml-1 ${getTextColor(stat.color)}`}>{stat.suffix}</span>}
              </div>
              <p className="text-zinc-300 font-medium">{stat.label}</p>
              {stat.description && <p className="text-sm text-zinc-500 mt-1">{stat.description}</p>}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

interface CounterProps {
  from: number
  to: number
  duration: number
}

function Counter({ from, to, duration }: CounterProps) {
  const [count, setCount] = useState(from)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      setCount(Math.floor(progress * (to - from) + from))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateCount)
      }
    }

    animationFrame = requestAnimationFrame(updateCount)

    return () => cancelAnimationFrame(animationFrame)
  }, [from, to, duration])

  return <>{count.toLocaleString()}</>
}

