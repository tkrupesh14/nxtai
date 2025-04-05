import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, BookOpen } from "lucide-react"
import CourseCard from "@/components/dashboard/course-card"

export default function CoursesPage() {
  // Sample course data
  const ongoingCourses = [
    {
      id: 1,
      title: "Advanced Prompt Engineering",
      description: "Master complex prompt techniques for specialized AI tasks and domains",
      progress: 45,
      instructor: "Dr. Sarah Chen",
      duration: "8 weeks",
      lessonsCompleted: 9,
      totalLessons: 20,
      image: "/placeholder.svg?height=200&width=400",
      color: "violet",
    },
    {
      id: 2,
      title: "AI for Creative Writing",
      description: "Learn to collaborate with AI for fiction, poetry, and creative content",
      progress: 70,
      instructor: "James Rodriguez",
      duration: "6 weeks",
      lessonsCompleted: 14,
      totalLessons: 20,
      image: "/placeholder.svg?height=200&width=400",
      color: "emerald",
    },
    {
      id: 3,
      title: "Prompt Engineering for Business",
      description: "Apply prompt engineering to solve real business problems and improve workflows",
      progress: 25,
      instructor: "Michelle Wong",
      duration: "5 weeks",
      lessonsCompleted: 5,
      totalLessons: 20,
      image: "/placeholder.svg?height=200&width=400",
      color: "amber",
    },
  ]

  const completedCourses = [
    {
      id: 4,
      title: "Prompt Engineering Fundamentals",
      description: "Learn the basics of crafting effective prompts for AI systems",
      progress: 100,
      instructor: "Dr. Alan Turing",
      completedDate: "Completed 2 weeks ago",
      duration: "4 weeks",
      lessonsCompleted: 16,
      totalLessons: 16,
      image: "/placeholder.svg?height=200&width=400",
      color: "rose",
    },
    {
      id: 5,
      title: "Understanding LLM Capabilities",
      description: "Explore the capabilities and limitations of large language models",
      progress: 100,
      instructor: "Dr. Emily Johnson",
      completedDate: "Completed 1 month ago",
      duration: "3 weeks",
      lessonsCompleted: 12,
      totalLessons: 12,
      image: "/placeholder.svg?height=200&width=400",
      color: "violet",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-zinc-400">Explore and continue your learning journey</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white group relative overflow-hidden w-full md:w-auto">
          <span className="relative z-10 flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Courses
          </span>
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-600 to-emerald-500"></span>
          <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-teal-600 to-emerald-600 transition-all duration-300 group-hover:h-full"></span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search courses..."
            className="pl-9 bg-zinc-900 border-zinc-700 focus:border-emerald-500"
          />
        </div>
        <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="ongoing" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Ongoing
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="mt-6">
          {ongoingCourses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {ongoingCourses.map((course) => (
                <CourseCard key={course.id} course={course} status="ongoing" />
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-zinc-800 p-3 mb-4">
                  <BookOpen className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No ongoing courses</h3>
                <p className="text-zinc-400 mb-4">Enroll in a course to begin your learning journey</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Browse Courses</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedCourses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {completedCourses.map((course) => (
                <CourseCard key={course.id} course={course} status="completed" />
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-zinc-800 p-3 mb-4">
                  <BookOpen className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No completed courses</h3>
                <p className="text-zinc-400 mb-4">Complete courses to see them here</p>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Browse Courses</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

