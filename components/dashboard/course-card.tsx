"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Clock, BookOpen, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface CourseCardProps {
  course: {
    id: number
    title: string
    description: string
    progress: number
    instructor: string
    duration: string
    lessonsCompleted: number
    totalLessons: number
    image: string
    completedDate?: string
    color: string
  }
  status: "ongoing" | "completed"
}

export default function CourseCard({ course, status }: CourseCardProps) {
  const getBorderColor = () => {
    switch (course.color) {
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
    switch (course.color) {
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
    switch (course.color) {
      case "violet":
        return "bg-violet-600 hover:bg-violet-700"
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-700"
      case "rose":
        return "bg-rose-600 hover:bg-rose-700"
      case "amber":
        return "bg-amber-600 hover:bg-amber-700"
      default:
        return "bg-emerald-600 hover:bg-emerald-700"
    }
  }

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`bg-zinc-900 rounded-xl overflow-hidden border ${getBorderColor()} transition-all duration-300 hover:shadow-lg group`}
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={course.image || "/placeholder.svg"}
          alt={course.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>

        {status === "completed" && (
          <div className="absolute top-2 right-2 flex items-center bg-emerald-900/70 text-emerald-400 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{course.description}</p>

        <div className="flex items-center text-xs text-zinc-500 mb-3">
          <span>Instructor: {course.instructor}</span>
          <span className="mx-2">•</span>
          <span className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {course.duration}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">
              <BookOpen className="h-3 w-3 inline mr-1" />
              {course.lessonsCompleted}/{course.totalLessons} lessons
            </span>
            <span className="text-zinc-300">{course.progress}%</span>
          </div>
          <Progress value={course.progress} className="h-1.5 bg-zinc-800">
            <div className={`h-full ${getProgressColor()}`} style={{ width: `${course.progress}%` }} />
          </Progress>
        </div>

        {status === "completed" && course.completedDate && (
          <div className="text-xs text-zinc-400 mb-4">{course.completedDate}</div>
        )}

        <Button className={`w-full text-white group relative overflow-hidden ${getButtonColor()}`}>
          <span className="relative z-10 flex items-center">
            {status === "ongoing" ? "Continue Learning" : "View Certificate"}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Button>
      </div>
    </motion.div>
  )
}

