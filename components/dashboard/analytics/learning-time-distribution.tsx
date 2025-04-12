"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// Sample data
const generateData = () => {
  return [
    {
      day: "Mon",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Tue",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Wed",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Thu",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Fri",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Sat",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
    {
      day: "Sun",
      assessments: Math.floor(Math.random() * 2) + 1,
      courses: Math.floor(Math.random() * 3) + 1,
      practice: Math.floor(Math.random() * 2),
    },
  ]
}

export default function LearningTimeDistribution() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    setData(generateData())
  }, [])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0)

      return (
        <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-md shadow-lg">
          <p className="text-zinc-300 text-xs font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center text-xs mb-1">
              <div className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: entry.color }}></div>
              <span className="text-zinc-400">{entry.name}: </span>
              <span className="text-zinc-300 ml-1 font-medium">{entry.value} hours</span>
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-zinc-700">
            <div className="flex items-center text-xs">
              <span className="text-zinc-400">Total: </span>
              <span className="text-zinc-300 ml-1 font-medium">{total} hours</span>
            </div>
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
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis dataKey="day" stroke="#666" tick={{ fill: "#999", fontSize: 12 }} tickMargin={10} />
          <YAxis
            stroke="#666"
            tick={{ fill: "#999", fontSize: 12 }}
            tickMargin={10}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value) => <span className="text-zinc-400 text-xs">{value}</span>}
          />
          <Bar dataKey="assessments" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="courses" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="practice" stackId="a" fill="#f43f5e" radius={[0, 0, 4, 4]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
