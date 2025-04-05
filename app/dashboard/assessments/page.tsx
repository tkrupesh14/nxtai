import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Filter } from "lucide-react"
import AssessmentCard from "@/components/dashboard/assessment-card"

export default function AssessmentsPage() {
  // Sample assessment data
  const ongoingAssessments = [
    {
      id: 1,
      title: "Advanced Prompt Structuring",
      description: "Learn to create complex, multi-part prompts for sophisticated AI interactions",
      progress: 65,
      dueDate: "2 days left",
      difficulty: "Advanced",
      category: "Prompt Engineering",
      color: "violet",
    },
    {
      id: 2,
      title: "Context Window Optimization",
      description: "Techniques for maximizing the effective use of limited context windows",
      progress: 30,
      dueDate: "5 days left",
      difficulty: "Intermediate",
      category: "Technical Skills",
      color: "emerald",
    },
  ]

  const completedAssessments = [
    {
      id: 3,
      title: "Prompt Basics",
      description: "Introduction to fundamental prompt engineering concepts and techniques",
      progress: 100,
      completedDate: "Completed 3 days ago",
      score: 92,
      difficulty: "Beginner",
      category: "Fundamentals",
      color: "amber",
    },
    {
      id: 4,
      title: "Chain-of-Thought Prompting",
      description: "Guide AI through complex reasoning tasks step by step",
      progress: 100,
      completedDate: "Completed 1 week ago",
      score: 88,
      difficulty: "Intermediate",
      category: "Advanced Techniques",
      color: "rose",
    },
    {
      id: 5,
      title: "Few-Shot Learning",
      description: "Provide examples to help AI understand the desired output format and style",
      progress: 100,
      completedDate: "Completed 2 weeks ago",
      score: 95,
      difficulty: "Intermediate",
      category: "Advanced Techniques",
      color: "violet",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-zinc-400">Track your progress and start new assessments</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden w-full md:w-auto">
          <span className="relative z-10 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Assessment
          </span>
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
          <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search assessments..."
            className="pl-9 bg-zinc-900 border-zinc-700 focus:border-violet-500"
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
          {ongoingAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ongoingAssessments.map((assessment) => (
                <AssessmentCard key={assessment.id} assessment={assessment} status="ongoing" />
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-zinc-800 p-3 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No ongoing assessments</h3>
                <p className="text-zinc-400 mb-4">Start a new assessment to begin your learning journey</p>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">Start New Assessment</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedAssessments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedAssessments.map((assessment) => (
                <AssessmentCard key={assessment.id} assessment={assessment} status="completed" />
              ))}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="pt-6 flex flex-col items-center justify-center text-center p-6">
                <div className="rounded-full bg-zinc-800 p-3 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No completed assessments</h3>
                <p className="text-zinc-400 mb-4">Complete assessments to see them here</p>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white">Browse Assessments</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

