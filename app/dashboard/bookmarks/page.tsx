"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  Filter,
  Bookmark,
  Zap,
  BookOpen,
  FileText,
  Video,
  ExternalLink,
  Trash2,
  Clock,
  Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function BookmarksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Sample bookmark data
  const assessmentBookmarks = [
    {
      id: 1,
      title: "Advanced Prompt Structuring",
      description: "Learn to create complex, multi-part prompts for sophisticated AI interactions",
      type: "assessment",
      tags: ["advanced", "prompt-engineering"],
      dateAdded: "2 days ago",
      icon: <Zap className="h-5 w-5" />,
      color: "violet",
    },
    {
      id: 2,
      title: "Context Window Optimization",
      description: "Techniques for maximizing the effective use of limited context windows",
      type: "assessment",
      tags: ["intermediate", "technical"],
      dateAdded: "1 week ago",
      icon: <Zap className="h-5 w-5" />,
      color: "emerald",
    },
  ]

  const courseBookmarks = [
    {
      id: 3,
      title: "AI for Creative Writing",
      description: "Learn to collaborate with AI for fiction, poetry, and creative content",
      type: "course",
      tags: ["creative", "writing"],
      dateAdded: "3 days ago",
      icon: <BookOpen className="h-5 w-5" />,
      color: "amber",
    },
    {
      id: 4,
      title: "Prompt Engineering for Business",
      description: "Apply prompt engineering to solve real business problems and improve workflows",
      type: "course",
      tags: ["business", "practical"],
      dateAdded: "2 weeks ago",
      icon: <BookOpen className="h-5 w-5" />,
      color: "rose",
    },
  ]

  const resourceBookmarks = [
    {
      id: 5,
      title: "Chain-of-Thought Prompting Guide",
      description: "Comprehensive guide to implementing chain-of-thought reasoning in prompts",
      type: "article",
      tags: ["guide", "advanced"],
      dateAdded: "1 day ago",
      icon: <FileText className="h-5 w-5" />,
      color: "blue",
    },
    {
      id: 6,
      title: "Prompt Engineering Best Practices",
      description: "Video tutorial on industry best practices for prompt engineering",
      type: "video",
      tags: ["tutorial", "best-practices"],
      dateAdded: "5 days ago",
      icon: <Video className="h-5 w-5" />,
      color: "violet",
    },
  ]

  // All available tags
  const allTags = [
    ...new Set([
      ...assessmentBookmarks.flatMap((b) => b.tags),
      ...courseBookmarks.flatMap((b) => b.tags),
      ...resourceBookmarks.flatMap((b) => b.tags),
    ]),
  ]

  // Filter bookmarks based on search query and selected tags
  const filterBookmarks = (bookmarks: typeof assessmentBookmarks) => {
    return bookmarks.filter((bookmark) => {
      const matchesSearch =
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => bookmark.tags.includes(tag))

      return matchesSearch && matchesTags
    })
  }

  const filteredAssessments = filterBookmarks(assessmentBookmarks)
  const filteredCourses = filterBookmarks(courseBookmarks)
  const filteredResources = filterBookmarks(resourceBookmarks)

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

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold">Bookmarks</h1>
          <p className="text-zinc-400">Save and organize your favorite content</p>
        </motion.div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search bookmarks..."
            className="pl-9 bg-zinc-900 border-zinc-700 focus:border-violet-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <Filter className="h-4 w-4 mr-2" />
              Filter by Tag
              <Badge className="ml-2 bg-violet-900/30 text-violet-400 hover:bg-violet-900/50">
                {selectedTags.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-zinc-700 p-2 max-h-60 overflow-auto">
            {allTags.map((tag) => (
              <DropdownMenuItem
                key={tag}
                className={`flex items-center gap-2 cursor-pointer ${
                  selectedTags.includes(tag) ? "bg-violet-900/30 text-violet-400" : ""
                }`}
                onClick={() => toggleTag(tag)}
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {selectedTags.includes(tag) && <div className="w-2 h-2 rounded-full bg-violet-400"></div>}
                </div>
                <span>{tag}</span>
              </DropdownMenuItem>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-zinc-400 hover:text-zinc-300"
                onClick={() => setSelectedTags([])}
              >
                Clear Filters
              </Button>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            All
          </TabsTrigger>
          <TabsTrigger value="assessments" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Assessments
          </TabsTrigger>
          <TabsTrigger value="courses" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Courses
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...filteredAssessments, ...filteredCourses, ...filteredResources].length > 0 ? (
              [...filteredAssessments, ...filteredCourses, ...filteredResources].map((bookmark, index) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Bookmark className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No bookmarks found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assessments" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.length > 0 ? (
              filteredAssessments.map((bookmark, index) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Zap className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No assessment bookmarks found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((bookmark, index) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <BookOpen className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No course bookmarks found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.length > 0 ? (
              filteredResources.map((bookmark, index) => (
                <BookmarkCard key={bookmark.id} bookmark={bookmark} index={index} />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No resource bookmarks found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Bookmark Card Component
function BookmarkCard({ bookmark, index }: { bookmark: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`p-6 rounded-xl border ${bookmark.getBorderColor?.(bookmark.color) || `border-${bookmark.color}-800/50 hover:border-${bookmark.color}-700/70`} ${bookmark.getBgColor?.(bookmark.color) || `bg-${bookmark.color}-900/20`} transition-all duration-300 hover:shadow-lg group relative`}
    >
      <div className="absolute top-4 right-4 flex space-x-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-start">
        <div
          className={`p-3 rounded-full ${bookmark.getBgColor?.(bookmark.color) || `bg-${bookmark.color}-900/20`} ${bookmark.getIconColor?.(bookmark.color) || `text-${bookmark.color}-400`} mr-4`}
        >
          {bookmark.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2 pr-16 group-hover:text-white">{bookmark.title}</h3>
          <p className="text-sm text-zinc-400 mb-4">{bookmark.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {bookmark.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center text-xs text-zinc-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>Added {bookmark.dateAdded}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
