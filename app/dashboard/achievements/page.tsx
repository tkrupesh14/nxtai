"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Filter, Award, Trophy, Medal, Star, Crown, Zap, BookOpen, Target, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function AchievementsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Sample achievement data
  const earnedAchievements = [
    {
      id: 1,
      title: "Prompt Master",
      description: "Completed 10 advanced prompt engineering assessments",
      date: "Earned 2 weeks ago",
      icon: <Award className="h-5 w-5" />,
      color: "violet",
      rarity: "Rare",
    },
    {
      id: 2,
      title: "Consistent Learner",
      description: "Maintained a 7-day learning streak",
      date: "Earned 3 days ago",
      icon: <Zap className="h-5 w-5" />,
      color: "emerald",
      rarity: "Common",
    },
    {
      id: 3,
      title: "Course Champion",
      description: "Completed 5 courses with distinction",
      date: "Earned 1 month ago",
      icon: <Trophy className="h-5 w-5" />,
      color: "amber",
      rarity: "Epic",
    },
    {
      id: 4,
      title: "AI Collaborator",
      description: "Successfully completed 20 AI collaboration exercises",
      date: "Earned 2 months ago",
      icon: <Sparkles className="h-5 w-5" />,
      color: "rose",
      rarity: "Uncommon",
    },
    {
      id: 5,
      title: "Knowledge Explorer",
      description: "Explored all available learning paths",
      date: "Earned 3 months ago",
      icon: <BookOpen className="h-5 w-5" />,
      color: "blue",
      rarity: "Rare",
    },
    {
      id: 6,
      title: "Perfect Score",
      description: "Achieved 100% on an advanced assessment",
      date: "Earned 2 months ago",
      icon: <Star className="h-5 w-5" />,
      color: "amber",
      rarity: "Legendary",
    },
  ]

  const upcomingAchievements = [
    {
      id: 7,
      title: "Prompt Engineer",
      description: "Complete 20 advanced prompt engineering assessments",
      progress: 65,
      icon: <Crown className="h-5 w-5" />,
      color: "violet",
      rarity: "Epic",
    },
    {
      id: 8,
      title: "Learning Addict",
      description: "Maintain a 30-day learning streak",
      progress: 30,
      icon: <Medal className="h-5 w-5" />,
      color: "emerald",
      rarity: "Rare",
    },
    {
      id: 9,
      title: "AI Expert",
      description: "Complete all expert-level courses",
      progress: 45,
      icon: <Target className="h-5 w-5" />,
      color: "rose",
      rarity: "Legendary",
    },
  ]

  const getBgColor = (color: string) => {
    switch (color) {
      case "violet":
        return "bg-violet-900/20"
      case "emerald":
        return "bg-emerald-900/20"
      case "rose":
        return "bg-rose-900/20"
      case "amber":
        return "bg-amber-900/20"
      case "blue":
        return "bg-blue-900/20"
      default:
        return "bg-violet-900/20"
    }
  }

  const getBorderColor = (color: string) => {
    switch (color) {
      case "violet":
        return "border-violet-800/50 hover:border-violet-700/70"
      case "emerald":
        return "border-emerald-800/50 hover:border-emerald-700/70"
      case "rose":
        return "border-rose-800/50 hover:border-rose-700/70"
      case "amber":
        return "border-amber-800/50 hover:border-amber-700/70"
      case "blue":
        return "border-blue-800/50 hover:border-blue-700/70"
      default:
        return "border-violet-800/50 hover:border-violet-700/70"
    }
  }

  const getIconColor = (color: string) => {
    switch (color) {
      case "violet":
        return "text-violet-400"
      case "emerald":
        return "text-emerald-400"
      case "rose":
        return "text-rose-400"
      case "amber":
        return "text-amber-400"
      case "blue":
        return "text-blue-400"
      default:
        return "text-violet-400"
    }
  }

  const getProgressColor = (color: string) => {
    switch (color) {
      case "violet":
        return "bg-violet-500"
      case "emerald":
        return "bg-emerald-500"
      case "rose":
        return "bg-rose-500"
      case "amber":
        return "bg-amber-500"
      case "blue":
        return "bg-blue-500"
      default:
        return "bg-violet-500"
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Common":
        return "bg-zinc-700 text-zinc-300"
      case "Uncommon":
        return "bg-emerald-900/30 border-emerald-700/50 text-emerald-400"
      case "Rare":
        return "bg-blue-900/30 border-blue-700/50 text-blue-400"
      case "Epic":
        return "bg-violet-900/30 border-violet-700/50 text-violet-400"
      case "Legendary":
        return "bg-amber-900/30 border-amber-700/50 text-amber-400"
      default:
        return "bg-zinc-700 text-zinc-300"
    }
  }

  // Filter achievements based on search query
  const filteredEarned = earnedAchievements.filter(
    (achievement) =>
      achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredUpcoming = upcomingAchievements.filter(
    (achievement) =>
      achievement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold">Achievements</h1>
          <p className="text-zinc-400">Track your accomplishments and upcoming milestones</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search achievements..."
            className="pl-9 bg-zinc-900 border-zinc-700 focus:border-violet-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Achievement Stats */}
      <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-bold text-violet-400 mb-2">{earnedAchievements.length}</div>
              <p className="text-zinc-400">Achievements Earned</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">
                {Math.round(
                  (earnedAchievements.length / (earnedAchievements.length + upcomingAchievements.length)) * 100,
                )}
                %
              </div>
              <p className="text-zinc-400">Completion Rate</p>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">
                {earnedAchievements.filter((a) => a.rarity === "Legendary" || a.rarity === "Epic").length}
              </div>
              <p className="text-zinc-400">Rare Achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="earned" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="earned" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Earned
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Upcoming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earned" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEarned.length > 0 ? (
              filteredEarned.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className={`p-6 rounded-xl border ${getBorderColor(achievement.color)} ${getBgColor(achievement.color)} transition-all duration-300 hover:shadow-lg group`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`p-4 rounded-full ${getBgColor(achievement.color)} ${getIconColor(achievement.color)} mb-4 transform transition-transform duration-300 group-hover:scale-110`}
                    >
                      {achievement.icon}
                    </div>
                    <Badge className={`mb-3 ${getRarityColor(achievement.rarity)}`}>{achievement.rarity}</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-white">{achievement.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{achievement.description}</p>
                    <span className="text-xs text-zinc-500">{achievement.date}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No achievements found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUpcoming.length > 0 ? (
              filteredUpcoming.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className={`p-6 rounded-xl border ${getBorderColor(achievement.color)} ${getBgColor(achievement.color)} transition-all duration-300 hover:shadow-lg group`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`p-4 rounded-full ${getBgColor(achievement.color)} ${getIconColor(achievement.color)} mb-4 transform transition-transform duration-300 group-hover:scale-110 opacity-70`}
                    >
                      {achievement.icon}
                    </div>
                    <Badge className={`mb-3 ${getRarityColor(achievement.rarity)}`}>{achievement.rarity}</Badge>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-white">{achievement.title}</h3>
                    <p className="text-sm text-zinc-400 mb-4">{achievement.description}</p>
                    <div className="w-full mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-zinc-300">{achievement.progress}%</span>
                      </div>
                      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${achievement.progress}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className={`h-full ${getProgressColor(achievement.color)}`}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No upcoming achievements found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
