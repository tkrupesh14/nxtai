"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface AchievementCardProps {
  achievement: {
    id: number
    title: string
    description: string
    date: string
    icon: ReactNode
    color: string
  }
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const getBgColor = () => {
    switch (achievement.color) {
      case "violet":
        return "bg-violet-900/20"
      case "emerald":
        return "bg-emerald-900/20"
      case "rose":
        return "bg-rose-900/20"
      case "amber":
        return "bg-amber-900/20"
      default:
        return "bg-violet-900/20"
    }
  }

  const getBorderColor = () => {
    switch (achievement.color) {
      case "violet":
        return "border-violet-800/50 hover:border-violet-700/70"
      case "emerald":
        return "border-emerald-800/50 hover:border-emerald-700/70"
      case "rose":
        return "border-rose-800/50 hover:border-rose-700/70"
      case "amber":
        return "border-amber-800/50 hover:border-amber-700/70"
      default:
        return "border-violet-800/50 hover:border-violet-700/70"
    }
  }

  const getIconColor = () => {
    switch (achievement.color) {
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
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl border ${getBorderColor()} ${getBgColor()} transition-all duration-300 hover:shadow-lg`}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`p-3 rounded-full ${getBgColor()} ${getIconColor()} mb-3`}>{achievement.icon}</div>
        <h3 className="font-medium mb-1">{achievement.title}</h3>
        <p className="text-xs text-zinc-400 mb-2">{achievement.description}</p>
        <span className="text-xs text-zinc-500">{achievement.date}</span>
      </div>
    </motion.div>
  )
}

