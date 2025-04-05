"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

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

  return (
    <div className="space-y-4">
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="p-3 bg-zinc-800 rounded-lg"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium">{course.title}</h3>
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
            <Progress value={course.progress} className="h-1.5 bg-zinc-700">
              <div className={`h-full ${getProgressColor(course.color)}`} style={{ width: `${course.progress}%` }} />
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
        View All Courses
      </Button>
    </div>
  )
}

