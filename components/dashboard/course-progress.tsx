"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CourseProgress() {
  const [courses] = useState([
    {
      id: 1,
      title: "Advanced Prompt Engineering",
      progress: 45,
      lessonsCompleted: 9,
      totalLessons: 20,
      color: "violet",
    },
    {
      id: 2,
      title: "AI for Creative Writing",
      progress: 70,
      lessonsCompleted: 14,
      totalLessons: 20,
      color: "emerald",
    },
    {
      id: 3,
      title: "Prompt Engineering for Business",
      progress: 25,
      lessonsCompleted: 5,
      totalLessons: 20,
      color: "amber",
    },
  ])

  const getProgressColor = (color: string) => {
    switch (color) {
      case "violet":
        return "bg-violet-500"
      case "emerald":
        return "bg-emerald-500"
      case "amber":
        return "bg-amber-500"
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
      case "amber":
        return "hover:shadow-amber-500/20"
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
      case "amber":
        return "hover:border-amber-700/50"
      default:
        return "hover:border-violet-700/50"
    }
  }

  return (
    <div className="space-y-4">
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className={`p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg border border-zinc-800/60 ${getBorderColor(course.color)} transition-all duration-300 hover:shadow-lg ${getGlowColor(course.color)} group`}
          whileHover={{ y: -2 }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium group-hover:text-white transition-colors duration-300">
              {course.title}
            </h3>
            <span className="text-xs text-zinc-400 flex items-center">
              <BookOpen className="h-3 w-3 mr-1" />
              {course.lessonsCompleted}/{course.totalLessons}
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">Progress</span>
              <span className="text-zinc-300">{course.progress}%</span>
            </div>
            <div className="relative h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${course.progress}%` }}
                transition={{ duration: 1, delay: 0.2 }}
                className={`h-full ${getProgressColor(course.color)}`}
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
        View All Courses
      </Button>
    </div>
  )
}
