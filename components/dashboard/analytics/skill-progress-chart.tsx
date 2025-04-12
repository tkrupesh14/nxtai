"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

// Sample data
const initialData = [
  { name: "Prompt Clarity", previous: 65, current: 85 },
  { name: "Context Management", previous: 50, current: 70 },
  { name: "Few-Shot Learning", previous: 40, current: 60 },
  { name: "Chain-of-Thought", previous: 55, current: 75 },
  { name: "Constraint Handling", previous: 30, current: 50 },
]

export default function SkillProgressChart() {
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-md shadow-lg">
          <p className="text-zinc-300 text-xs font-medium mb-2">{label}</p>
          <div className="flex items-center text-xs mb-1">
            <div className="h-2 w-2 rounded-full mr-2 bg-zinc-500"></div>
            <span className="text-zinc-400">Previous: </span>
            <span className="text-zinc-300 ml-1 font-medium">{payload[0].value}%</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="h-2 w-2 rounded-full mr-2 bg-emerald-500"></div>
            <span className="text-zinc-400">Current: </span>
            <span className="text-zinc-300 ml-1 font-medium">{payload[1].value}%</span>
          </div>
          <div className="flex items-center text-xs mt-2 pt-2 border-t border-zinc-700">
            <div className="h-2 w-2 rounded-full mr-2 bg-emerald-500"></div>
            <span className="text-zinc-400">Improvement: </span>
            <span className="text-emerald-400 ml-1 font-medium">+{payload[1].value - payload[0].value}%</span>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barGap={0}
          barCategoryGap={30}
          onMouseMove={(data) => {
            if (data.activeTooltipIndex !== undefined) {
              setActiveIndex(data.activeTooltipIndex)
            }
          }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="name" stroke="#666" tick={{ fill: "#999", fontSize: 12 }} tickMargin={10} />
          <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} tickMargin={10} domain={[0, 100]} tickCount={6} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="previous" fill="#4b5563" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`previous-${index}`}
                fill={activeIndex === index ? "#6b7280" : "#4b5563"}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
              />
            ))}
          </Bar>
          <Bar dataKey="current" fill="#10b981" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`current-${index}`}
                fill={activeIndex === index ? "#34d399" : "#10b981"}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
