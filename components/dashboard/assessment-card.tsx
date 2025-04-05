"use client"

import { motion } from "framer-motion"
import { Clock, BarChart, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface AssessmentCardProps {
  assessment: {
    id: number
    title: string
    description: string
    progress: number
    dueDate?: string
    completedDate?: string
    score?: number
    difficulty: string
    category: string
    color: string
  }
  status: "ongoing" | "completed"
}

export default function AssessmentCard({ assessment, status }: AssessmentCardProps) {
  const getBorderColor = () => {
    switch (assessment.color) {
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

  const getProgressColor = () => {
    switch (assessment.color) {
      case "violet":
        return "bg-violet-500"
      case "emerald":
        return "bg-emerald-500"
      case "rose":
        return "bg-rose-500"
      case "amber":
        return "bg-amber-500"
      default:
        return "bg-violet-500"
    }
  }

  const getButtonColor = () => {
    switch (assessment.color) {
      case "violet":
        return "bg-violet-600 hover:bg-violet-700"
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-700"
      case "rose":
        return "bg-rose-600 hover:bg-rose-700"
      case "amber":
        return "bg-amber-600 hover:bg-amber-700"
      default:
        return "bg-violet-600 hover:bg-violet-700"
    }
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-zinc-900 rounded-xl overflow-hidden border ${getBorderColor()} transition-all duration-300 hover:shadow-lg group`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">{assessment.title}</h3>
          {status === "completed" && assessment.score && (
            <div className="flex items-center bg-emerald-900/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium">
              <CheckCircle className="h-3 w-3 mr-1" />
              {assessment.score}%
            </div>
          )}
        </div>

        <p className="text-zinc-400 text-sm mb-4">{assessment.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-xs flex items-center">
            <BarChart className="h-3 w-3 mr-1" />
            {assessment.difficulty}
          </div>
          <div className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md text-xs">{assessment.category}</div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-300">{assessment.progress}%</span>
          </div>
          <Progress value={assessment.progress} className="h-1.5 bg-zinc-800">
            <div className={`h-full ${getProgressColor()}`} style={{ width: `${assessment.progress}%` }} />
          </Progress>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-zinc-400 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {status === "ongoing" ? assessment.dueDate : assessment.completedDate}
          </div>
        </div>

        <Button className={`w-full text-white group relative overflow-hidden ${getButtonColor()}`}>
          <span className="relative z-10 flex items-center">
            {status === "ongoing" ? "Continue" : "Review"}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
      </div>
    </motion.div>
  )
}

