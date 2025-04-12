"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, type TooltipProps } from "recharts"

// Sample data
const generateData = () => {
  const data = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Generate some random activity data
    const assessments = Math.floor(Math.random() * 3)
    const courses = Math.floor(Math.random() * 2)
    const practice = Math.floor(Math.random() * 4)

    data.push({
      date: date.toISOString().split("T")[0],
      assessments,
      courses,
      practice,
      total: assessments + courses + practice,
    })
  }

  return data
}

export default function ActivityOverview() {
  const [data, setData] = useState<any[]>([])
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setData(generateData())
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-md shadow-lg">
          <p className="text-zinc-300 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center text-xs mb-1">
              <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></div>
              <span className="text-zinc-400">{entry.name}: </span>
              <span className="text-zinc-300 ml-1 font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }

    return null
  }

  // Format date for x-axis
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.getDate().toString()
  }

  return (
    <div className="h-72 relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="text-zinc-800 text-9xl font-bold opacity-20">Activity</div>
      </div>

      <div className="relative z-10 h-full" ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            onMouseMove={(e) => {
              if (e.activeLabel) {
                setHoveredDate(e.activeLabel)
              } else {
                setHoveredDate(null)
              }
            }}
            onMouseLeave={() => setHoveredDate(null)}
          >
            <defs>
              <linearGradient id="assessmentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="coursesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="practiceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} tickMargin={10} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="assessments"
              name="Assessments"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#1f1f23", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="courses"
              name="Courses"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981", stroke: "#1f1f23", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="practice"
              name="Practice"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#f43f5e", stroke: "#1f1f23", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex justify-center mt-2 space-x-6">
        <motion.div className="flex items-center text-xs" whileHover={{ scale: 1.05 }}>
          <div className="h-2 w-2 rounded-full bg-violet-500 mr-2"></div>
          <span className="text-zinc-400">Assessments</span>
        </motion.div>
        <motion.div className="flex items-center text-xs" whileHover={{ scale: 1.05 }}>
          <div className="h-2 w-2 rounded-full bg-emerald-500 mr-2"></div>
          <span className="text-zinc-400">Courses</span>
        </motion.div>
        <motion.div className="flex items-center text-xs" whileHover={{ scale: 1.05 }}>
          <div className="h-2 w-2 rounded-full bg-rose-500 mr-2"></div>
          <span className="text-zinc-400">Practice</span>
        </motion.div>
      </div>
    </div>
  )
}
