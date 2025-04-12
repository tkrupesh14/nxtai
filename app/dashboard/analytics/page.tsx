"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { BarChart, LineChart, PieChart, ArrowUpRight, Calendar, Download, Filter } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PerformanceChart from "@/components/dashboard/analytics/performance-chart"
import SkillProgressChart from "@/components/dashboard/analytics/skill-progress-chart"
import AssessmentBreakdown from "@/components/dashboard/analytics/assessment-breakdown"
import LearningTimeDistribution from "@/components/dashboard/analytics/learning-time-distribution"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30days")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-zinc-400">Track your learning progress and performance metrics</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </motion.div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Assessment Score</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-violet-400 transition-colors duration-300">
                  87<span className="text-lg">%</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-violet-900/20 text-violet-400 group-hover:bg-violet-900/30 transition-all duration-300 group-hover:scale-110">
                <BarChart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+5% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Completed Lessons</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-emerald-400 transition-colors duration-300">
                  42<span className="text-lg">/60</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-900/20 text-emerald-400 group-hover:bg-emerald-900/30 transition-all duration-300 group-hover:scale-110">
                <LineChart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+12 this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-amber-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Learning Hours</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-amber-400 transition-colors duration-300">
                  28<span className="text-lg">h</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-900/20 text-amber-400 group-hover:bg-amber-900/30 transition-all duration-300 group-hover:scale-110">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>+3h from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-rose-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Skill Growth</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-rose-400 transition-colors duration-300">
                  +18<span className="text-lg">%</span>
                </p>
              </div>
              <div className="p-3 rounded-full bg-rose-900/20 text-rose-400 group-hover:bg-rose-900/30 transition-all duration-300 group-hover:scale-110">
                <PieChart className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              <span>Improving steadily</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="performance" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
            <TabsTrigger value="performance" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              Skills
            </TabsTrigger>
            <TabsTrigger value="time" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              Time
            </TabsTrigger>
            <TabsTrigger value="assessments" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              Assessments
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <TabsContent value="performance" className="mt-0 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>Your assessment scores and completion rates</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <PerformanceChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-0 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <CardTitle>Skill Progress</CardTitle>
              <CardDescription>Your improvement in different skill areas</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <SkillProgressChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="mt-0 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-amber-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <CardTitle>Learning Time Distribution</CardTitle>
              <CardDescription>How you spend your learning time</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <LearningTimeDistribution />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments" className="mt-0 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-rose-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="pb-2">
              <CardTitle>Assessment Breakdown</CardTitle>
              <CardDescription>Performance across different assessment types</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <AssessmentBreakdown />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
