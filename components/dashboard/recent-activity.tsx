"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Zap, BookOpen, Award, Clock } from "lucide-react"

export default function RecentActivity() {
  const [activities] = useState([
    {
      id: 1,
      type: "assessment",
      title: 'Completed "Advanced Prompt Structuring" assessment',
      time: "2 hours ago",
      score: 92,
      icon: <Zap className="h-4 w-4" />,
      color: "violet",
    },
    {
      id: 2,
      type: "course",
      title: 'Started "AI for Creative Writing" course',
      time: "1 day ago",
      icon: <BookOpen className="h-4 w-4" />,
      color: "emerald",
    },
    {
      id: 3,
      type: "achievement",
      title: 'Earned "Consistent Learner" badge',
      time: "3 days ago",
      icon: <Award className="h-4 w-4" />,
      color: "amber",
    },
    {
      id: 4,
      type: "assessment",
      title: 'Started "Context Window Optimization" assessment',
      time: "4 days ago",
      icon: <Zap className="h-4 w-4" />,
      color: "violet",
    },
    {
      id: 5,
      type: "course",
      title: 'Completed lesson 5 in "Prompt Engineering Fundamentals"',
      time: "1 week ago",
      icon: <BookOpen className="h-4 w-4" />,
      color: "emerald",
    },
  ])

  const getIconBackground = (color: string) => {
    switch (color) {
      case "violet":
        return "bg-violet-900/30 text-violet-400 group-hover:bg-violet-900/50 group-hover:text-violet-300"
      case "emerald":
        return "bg-emerald-900/30 text-emerald-400 group-hover:bg-emerald-900/50 group-hover:text-emerald-300"
      case "amber":
        return "bg-amber-900/30 text-amber-400 group-hover:bg-amber-900/50 group-hover:text-amber-300"
      case "rose":
        return "bg-rose-900/30 text-rose-400 group-hover:bg-rose-900/50 group-hover:text-rose-300"
      default:
        return "bg-violet-900/30 text-violet-400 group-hover:bg-violet-900/50 group-hover:text-violet-300"
    }
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ x: 3 }}
          className="flex items-start gap-3 group cursor-pointer"
        >
          <div
            className={`p-2 rounded-full ${getIconBackground(activity.color)} mt-0.5 transition-colors duration-300`}
          >
            {activity.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm text-zinc-300 group-hover:text-white transition-colors duration-300">
              {activity.title}
            </p>
            <div className="flex items-center text-xs text-zinc-500 mt-1">
              <Clock className="h-3 w-3 mr-1" />
              <span>{activity.time}</span>
              {activity.score && (
                <>
                  <span className="mx-1">•</span>
                  <span className="text-emerald-400">Score: {activity.score}%</span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
