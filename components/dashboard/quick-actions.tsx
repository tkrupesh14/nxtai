"use client"

import { motion } from "framer-motion"
import { Zap, BookOpen, Award, User, Settings, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function QuickActions() {
  const actions = [
    {
      icon: <Zap className="h-5 w-5" />,
      label: "Start Assessment",
      href: "/dashboard/assessments",
      color: "violet",
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: "Browse Courses",
      href: "/dashboard/courses",
      color: "emerald",
    },
    {
      icon: <Award className="h-5 w-5" />,
      label: "Achievements",
      href: "/dashboard/profile",
      color: "amber",
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "Profile",
      href: "/dashboard/profile",
      color: "rose",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Settings",
      href: "/dashboard/settings",
      color: "blue",
    },
    {
      icon: <HelpCircle className="h-5 w-5" />,
      label: "Help Center",
      href: "/help",
      color: "purple",
    },
  ]

  const getGradient = (color: string) => {
    switch (color) {
      case "violet":
        return "from-violet-600/20 to-violet-800/20 hover:from-violet-600/30 hover:to-violet-800/30 border-violet-700/30 hover:border-violet-500/50"
      case "emerald":
        return "from-emerald-600/20 to-emerald-800/20 hover:from-emerald-600/30 hover:to-emerald-800/30 border-emerald-700/30 hover:border-emerald-500/50"
      case "amber":
        return "from-amber-600/20 to-amber-800/20 hover:from-amber-600/30 hover:to-amber-800/30 border-amber-700/30 hover:border-amber-500/50"
      case "rose":
        return "from-rose-600/20 to-rose-800/20 hover:from-rose-600/30 hover:to-rose-800/30 border-rose-700/30 hover:border-rose-500/50"
      case "blue":
        return "from-blue-600/20 to-blue-800/20 hover:from-blue-600/30 hover:to-blue-800/30 border-blue-700/30 hover:border-blue-500/50"
      case "purple":
        return "from-purple-600/20 to-purple-800/20 hover:from-purple-600/30 hover:to-purple-800/30 border-purple-700/30 hover:border-purple-500/50"
      default:
        return "from-violet-600/20 to-violet-800/20 hover:from-violet-600/30 hover:to-violet-800/30 border-violet-700/30 hover:border-violet-500/50"
    }
  }

  const getIconColor = (color: string) => {
    switch (color) {
      case "violet":
        return "text-violet-400 group-hover:text-violet-300"
      case "emerald":
        return "text-emerald-400 group-hover:text-emerald-300"
      case "amber":
        return "text-amber-400 group-hover:text-amber-300"
      case "rose":
        return "text-rose-400 group-hover:text-rose-300"
      case "blue":
        return "text-blue-400 group-hover:text-blue-300"
      case "purple":
        return "text-purple-400 group-hover:text-purple-300"
      default:
        return "text-violet-400 group-hover:text-violet-300"
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {actions.map((action, index) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Link
            href={action.href}
            className={`flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br ${getGradient(
              action.color,
            )} backdrop-blur-sm border transition-all duration-300 hover:shadow-lg group h-full`}
          >
            <div
              className={`p-3 rounded-full bg-black/30 mb-3 ${getIconColor(
                action.color,
              )} transition-transform duration-300 group-hover:scale-110`}
            >
              {action.icon}
            </div>
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors duration-300">
              {action.label}
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
