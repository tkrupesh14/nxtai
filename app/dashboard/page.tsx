import { Zap, Clock, TrendingUp, Award, ArrowRight, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ActivityOverview from "@/components/dashboard/activity-overview"
import RecentActivity from "@/components/dashboard/recent-activity"
import UpcomingAssessments from "@/components/dashboard/upcoming-assessments"
import CourseProgress from "@/components/dashboard/course-progress"
import SkillRadar from "@/components/dashboard/skill-radar"
import QuickActions from "@/components/dashboard/quick-actions"
import WelcomeBanner from "@/components/dashboard/welcome-banner"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Completed Assessments</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-violet-400 transition-colors duration-300">12</p>
              </div>
              <div className="p-3 rounded-full bg-violet-900/20 text-violet-400 group-hover:bg-violet-900/30 transition-all duration-300 group-hover:scale-110">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+3 this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Courses in Progress</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-emerald-400 transition-colors duration-300">3</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-900/20 text-emerald-400 group-hover:bg-emerald-900/30 transition-all duration-300 group-hover:scale-110">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>+1 this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-amber-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Learning Streak</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-amber-400 transition-colors duration-300">
                  7 days
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-900/20 text-amber-400 group-hover:bg-amber-900/30 transition-all duration-300 group-hover:scale-110">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>Keep it up!</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-rose-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-900/10 group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Achievements</p>
                <p className="text-3xl font-bold mt-1 group-hover:text-rose-400 transition-colors duration-300">8</p>
              </div>
              <div className="p-3 rounded-full bg-rose-900/20 text-rose-400 group-hover:bg-rose-900/30 transition-all duration-300 group-hover:scale-110">
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
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 lg:col-span-2 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Activity Overview</CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <Clock className="h-4 w-4 mr-2" />
                30 Days
              </Button>
            </div>
            <CardDescription>Your learning activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityOverview />
          </CardContent>
        </Card>

        {/* Skill Radar */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Skill Radar</CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <Plus className="h-4 w-4 mr-2" />
                Details
              </Button>
            </div>
            <CardDescription>Your prompt engineering skills</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillRadar />
          </CardContent>
        </Card>

        {/* Upcoming Assessments */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Assessments</CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Your scheduled and in-progress assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <UpcomingAssessments />
          </CardContent>
        </Card>

        {/* Course Progress */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Course Progress</CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Your ongoing course completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <CourseProgress />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-rose-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
