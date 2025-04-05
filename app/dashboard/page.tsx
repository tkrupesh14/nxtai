import { Sparkles, Zap, Clock, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ActivityOverview from "@/components/dashboard/activity-overview" 
import RecentActivity from "@/components/dashboard/recent-activity"
import UpcomingAssessments from "@/components/dashboard/upcoming-assessments"
import CourseProgress from "@/components/dashboard/course-progress"
import SkillRadar from "@/components/dashboard/skill-radar"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-zinc-400">Welcome back, Alex! Here's an overview of your learning journey.</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden w-full md:w-auto">
          <span className="relative z-10 flex items-center">
            <Sparkles className="h-4 w-4 mr-2" />
            Start New Assessment
          </span>
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
          <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Completed Assessments</p>
                <p className="text-3xl font-bold mt-1">12</p>
              </div>
              <div className="p-3 rounded-full bg-violet-900/20 text-violet-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+3 this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Courses in Progress</p>
                <p className="text-3xl font-bold mt-1">3</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-900/20 text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+1 this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Learning Streak</p>
                <p className="text-3xl font-bold mt-1">7 days</p>
              </div>
              <div className="p-3 rounded-full bg-amber-900/20 text-amber-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Keep it up!</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Achievements</p>
                <p className="text-3xl font-bold mt-1">8</p>
              </div>
              <div className="p-3 rounded-full bg-rose-900/20 text-rose-400">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+2 this week</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Overview */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Activity Overview</CardTitle>
            <CardDescription>Your learning activity over the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityOverview />
          </CardContent>
        </Card>

        {/* Skill Radar */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle>Skill Radar</CardTitle>
            <CardDescription>Your prompt engineering skills</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillRadar />
          </CardContent>
        </Card>

        {/* Upcoming Assessments */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle>Upcoming Assessments</CardTitle>
            <CardDescription>Your scheduled and in-progress assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingAssessments />
          </CardContent>
        </Card>

        {/* Course Progress */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle>Course Progress</CardTitle>
            <CardDescription>Your ongoing course completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <CourseProgress />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

