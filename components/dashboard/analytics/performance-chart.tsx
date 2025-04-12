"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// Sample data
const generateData = () => {
  const data = []
  const now = new Date()

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    // Generate some random performance data
    const assessmentScore = Math.floor(Math.random() * 20) + 70 // 70-90
    const completionRate = Math.floor(Math.random() * 30) + 60 // 60-90

    data.push({
      date: date.toISOString().split("T")[0],
      assessmentScore,
      completionRate,
    })
  }

  return data
}

export default function PerformanceChart() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setData(generateData())
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-md shadow-lg">
          <p className="text-zinc-300 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center text-xs mb-1">
              <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></div>
              <span className="text-zinc-400">{entry.name}: </span>
              <span className="text-zinc-300 ml-1 font-medium">{entry.value}%</span>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="h-full w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
          <YAxis stroke="#666" tick={{ fill: "#999", fontSize: 12 }} tickMargin={10} domain={[0, 100]} tickCount={6} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
          />
          <Line
            type="monotone"
            dataKey="assessmentScore"
            name="Assessment Score"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#1f1f23", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            name="Completion Rate"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: "#10b981", stroke: "#1f1f23", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
