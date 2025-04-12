"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

// Sample data
const initialData = [
  { name: "Beginner", value: 15, color: "#10b981" },
  { name: "Intermediate", value: 45, color: "#8b5cf6" },
  { name: "Advanced", value: 30, color: "#f43f5e" },
  { name: "Expert", value: 10, color: "#f59e0b" },
]

export default function AssessmentBreakdown() {
  const [data, setData] = useState<any[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    // Animate data loading
    setData([])
    const timer = setTimeout(() => {
      setData(initialData)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-md shadow-lg">
          <div className="flex items-center text-xs mb-1">
            <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: payload[0].payload.color }}></div>
            <span className="text-zinc-300 font-medium">{payload[0].name}: </span>
            <span className="text-zinc-300 ml-1 font-medium">{payload[0].value}%</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">{getAssessmentDescription(payload[0].name)}</div>
        </div>
      )
    }

    return null
  }

  const getAssessmentDescription = (level: string) => {
    switch (level) {
      case "Beginner":
        return "Basic prompt engineering concepts"
      case "Intermediate":
        return "More complex prompt techniques"
      case "Advanced":
        return "Sophisticated multi-part prompts"
      case "Expert":
        return "System-level prompt engineering"
      default:
        return ""
    }
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
