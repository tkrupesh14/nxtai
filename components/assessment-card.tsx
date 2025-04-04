"use client"

import type { ReactNode } from "react"
import { Clock, BarChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface AssessmentCardProps {
  icon: ReactNode
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  color: "emerald" | "violet" | "rose" | "amber"
}

export default function AssessmentCard({
  icon,
  title,
  description,
  difficulty,
  estimatedTime,
  color,
}: AssessmentCardProps) {
  const getGradient = () => {
    switch (color) {
      case "emerald":
        return "from-emerald-900/50 to-transparent"
      case "violet":
        return "from-violet-900/50 to-transparent"
      case "rose":
        return "from-rose-900/50 to-transparent"
      case "amber":
        return "from-amber-900/50 to-transparent"
      default:
        return "from-emerald-900/50 to-transparent"
    }
  }

  const getBorderColor = () => {
    switch (color) {
      case "emerald":
        return "border-emerald-800/50 hover:border-emerald-700"
      case "violet":
        return "border-violet-800/50 hover:border-violet-700"
      case "rose":
        return "border-rose-800/50 hover:border-rose-700"
      case "amber":
        return "border-amber-800/50 hover:border-amber-700"
      default:
        return "border-emerald-800/50 hover:border-emerald-700"
    }
  }

  const getButtonColor = () => {
    switch (color) {
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-700"
      case "violet":
        return "bg-violet-600 hover:bg-violet-700"
      case "rose":
        return "bg-rose-600 hover:bg-rose-700"
      case "amber":
        return "bg-amber-600 hover:bg-amber-700"
      default:
        return "bg-emerald-600 hover:bg-emerald-700"
    }
  }

  const getGlowColor = () => {
    switch (color) {
      case "emerald":
        return "group-hover:shadow-emerald-500/20"
      case "violet":
        return "group-hover:shadow-violet-500/20"
      case "rose":
        return "group-hover:shadow-rose-500/20"
      case "amber":
        return "group-hover:shadow-amber-500/20"
      default:
        return "group-hover:shadow-emerald-500/20"
    }
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-zinc-800 rounded-xl overflow-hidden border ${getBorderColor()} transition-all duration-300 hover:shadow-lg ${getGlowColor()} group relative`}
    >
      {/* Animated gradient border */}
      <div className={`h-2 bg-gradient-to-r ${getGradient()}`}></div>

      {/* Animated background glow on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-${color}-900/0 to-${color}-900/0 group-hover:from-${color}-900/10 group-hover:to-transparent transition-all duration-500`}
      ></div>

      <div className="p-6 relative z-10">
        <motion.div className="mb-4" whileHover={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5 }}>
          {icon}
        </motion.div>
        <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
        <p className="text-zinc-400 mb-6">{description}</p>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center text-sm text-zinc-500">
            <BarChart className="h-4 w-4 mr-1" />
            {difficulty}
          </div>
          <div className="flex items-center text-sm text-zinc-500">
            <Clock className="h-4 w-4 mr-1" />
            {estimatedTime}
          </div>
        </div>
        <Button className={`w-full ${getButtonColor()} text-white group relative overflow-hidden`}>
          <span className="relative z-10">Start Assessment</span>
          <span className="absolute bottom-0 left-0 w-0 h-full bg-black/20 transition-all duration-300 group-hover:w-full"></span>
        </Button>
      </div>
    </motion.div>
  )
}

