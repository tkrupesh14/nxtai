"use client"

import Image from "next/image"
import { motion } from "framer-motion"

interface FeatureHighlightProps {
  title: string
  description: string
  image: string
  color: "emerald" | "violet" | "rose" | "amber"
}

export default function FeatureHighlight({ title, description, image, color }: FeatureHighlightProps) {
  const getBgColor = () => {
    switch (color) {
      case "emerald":
        return "bg-emerald-900/10"
      case "violet":
        return "bg-violet-900/10"
      case "rose":
        return "bg-rose-900/10"
      case "amber":
        return "bg-amber-900/10"
      default:
        return "bg-violet-900/10"
    }
  }

  const getBorderColor = () => {
    switch (color) {
      case "emerald":
        return "border-emerald-800/30"
      case "violet":
        return "border-violet-800/30"
      case "rose":
        return "border-rose-800/30"
      case "amber":
        return "border-amber-800/30"
      default:
        return "border-violet-800/30"
    }
  }

  const getTextColor = () => {
    switch (color) {
      case "emerald":
        return "text-emerald-400"
      case "violet":
        return "text-violet-400"
      case "rose":
        return "text-rose-400"
      case "amber":
        return "text-amber-400"
      default:
        return "text-violet-400"
    }
  }

  const getGlowColor = () => {
    switch (color) {
      case "emerald":
        return "hover:shadow-emerald-500/10"
      case "violet":
        return "hover:shadow-violet-500/10"
      case "rose":
        return "hover:shadow-rose-500/10"
      case "amber":
        return "hover:shadow-amber-500/10"
      default:
        return "hover:shadow-violet-500/10"
    }
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl overflow-hidden border ${getBorderColor()} ${getBgColor()} transition-all duration-300 hover:shadow-lg ${getGlowColor()} group`}
    >
      <div className="relative h-64 w-full overflow-hidden">
        <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.5 }} className="h-full w-full">
          <Image
            src={image || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>

        {/* Animated overlay on hover */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 bg-${color}-500/10 mix-blend-overlay`}
        ></motion.div>
      </div>
      <div className="p-6 relative">
        <h3 className={`text-2xl font-semibold mb-3 ${getTextColor()}`}>{title}</h3>
        <p className="text-zinc-400">{description}</p>

        {/* Animated underline on hover */}
        <div
          className={`absolute bottom-0 left-6 right-6 h-0.5 bg-${color}-500/0 transform scale-x-0 origin-left transition-all duration-300 group-hover:bg-${color}-500/30 group-hover:scale-x-100`}
        ></div>
      </div>
    </motion.div>
  )
}

