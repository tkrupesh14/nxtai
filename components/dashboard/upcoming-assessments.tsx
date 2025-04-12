"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UpcomingAssessments() {
  const [assessments] = useState([
    {
      id: 1,
      title: "Advanced Prompt Structuring",
      dueDate: "2 days left",
      progress: 65,
      color: "violet",
    },
    {
      id: 2,
      title: "Context Window Optimization",
      dueDate: "5 days left",
      progress: 30,
      color: "emerald",
    },
    {
      id: 3,
      title: "Few-Shot Learning Techniques",
      dueDate: "1 week left",
      progress: 0,
      color: "rose",
    },
  ])

  const getProgressColor = (color: string) => {
    switch (color) {
      case "violet":
        return "bg-violet-500"
      case "emerald":
        return "bg-emerald-500"
      case "rose":
        return "bg-rose-500"
      default:
        return "bg-violet-500"
    }
  }

  const getGlowColor = (color: string) => {
    switch (color) {
      case "violet":
        return "hover:shadow-violet-500/20"
      case "emerald":
        return "hover:shadow-emerald-500/20"
      case "rose":
        return "hover:shadow-rose-500/20"
      default:
        return "hover:shadow-violet-500/20"
    }
  }

  const getBorderColor = (color: string) => {
    switch (color) {
      case "violet":
        return "hover:border-violet-700/50"
      case "emerald":
        return "hover:border-emerald-700/50"
      case "rose":
        return "hover:border-rose-700/50"
      default:
        return "hover:border-violet-700/50"
    }
  }

  return (
    <div className="space-y-4">
      {assessments.map((assessment, index) => (
        <motion.div
          key={assessment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-800/60 ${getBorderColor(assessment.color)} transition-all duration-300 hover:shadow-lg ${getGlowColor(assessment.color)} group`}
          whileHover={{ y: -2 }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium group-hover:text-white transition-colors duration-300">
              {assessment.title}
            </h3>
            <span className="text-xs text-zinc-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {assessment.dueDate}
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Progress</span>
              <span className="text-zinc-300">{assessment.progress}%</span>
            </div>
            <div className="relative h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${assessment.progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-full ${getProgressColor(assessment.color)}`}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-zinc-300 hover:bg-zinc-700 hover:text-white group"
          >
            <span>Continue</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </motion.div>
      ))}

      <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
        View All Assessments
      </Button>
    </div>
  )
}
