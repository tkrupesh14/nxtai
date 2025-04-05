"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

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

  return (
    <div className="space-y-4">
      {assessments.map((assessment, index) => (
        <motion.div
          key={assessment.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="p-3 bg-zinc-800 rounded-lg"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium">{assessment.title}</h3>
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
            <Progress value={assessment.progress} className="h-1.5 bg-zinc-700">
              <div
                className={`h-full ${getProgressColor(assessment.color)}`}
                style={{ width: `${assessment.progress}%` }}
              />
            </Progress>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-zinc-300 hover:bg-zinc-700 hover:text-white"
          >
            <span>Continue</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      ))}

      <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
        View All Assessments
      </Button>
    </div>
  )
}

