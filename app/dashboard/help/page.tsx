"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Search,
  HelpCircle,
  Book,
  Video,
  FileText,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Zap,
  BookOpen,
  Play,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Sample FAQ data
  const faqs = [
    {
      question: "How do I start an assessment?",
      answer:
        "You can start an assessment by navigating to the Assessments page from the sidebar, then clicking on the 'Start Assessment' button. You can also find recommended assessments on your dashboard.",
    },
    {
      question: "How are my skills evaluated?",
      answer:
        "Your skills are evaluated based on your performance in assessments, your course progress, and the quality of your prompt engineering solutions. Our AI system analyzes your responses and provides personalized feedback.",
    },
    {
      question: "Can I retake an assessment?",
      answer:
        "Yes, you can retake assessments to improve your score. Each assessment can be taken multiple times, and we'll keep track of your best performance.",
    },
    {
      question: "How do I track my progress?",
      answer:
        "Your progress is tracked automatically and displayed on your dashboard. You can see detailed analytics by visiting the Analytics page from the sidebar.",
    },
    {
      question: "What are achievements and how do I earn them?",
      answer:
        "Achievements are rewards for reaching specific milestones in your learning journey. You can earn them by completing courses, maintaining learning streaks, achieving high scores in assessments, and more.",
    },
  ]

  // Sample guides data
  const guides = [
    {
      title: "Getting Started with NxtAI",
      description: "A comprehensive guide to help you get started with the platform",
      type: "article",
      readTime: "5 min read",
      icon: <Book className="h-5 w-5" />,
      color: "violet",
    },
    {
      title: "Prompt Engineering Basics",
      description: "Learn the fundamentals of crafting effective prompts",
      type: "video",
      readTime: "10 min watch",
      icon: <Video className="h-5 w-5" />,
      color: "emerald",
    },
    {
      title: "Advanced Assessment Techniques",
      description: "Tips and strategies for excelling in advanced assessments",
      type: "article",
      readTime: "8 min read",
      icon: <FileText className="h-5 w-5" />,
      color: "amber",
    },
    {
      title: "Using the Analytics Dashboard",
      description: "How to interpret and leverage your performance data",
      type: "video",
      readTime: "7 min watch",
      icon: <Video className="h-5 w-5" />,
      color: "rose",
    },
  ]

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Filter guides based on search query
  const filteredGuides = guides.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-zinc-400">Find answers, guides, and support resources</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </motion.div>
      </div>

      {/* Search */}
      <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">How can we help you today?</h2>
              <p className="text-zinc-400">Search for guides, FAQs, and tutorials</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <Input
                placeholder="Search for help..."
                className="pl-10 py-6 bg-zinc-800 border-zinc-700 focus:border-violet-500 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 flex items-start">
            <div className="p-3 rounded-full bg-violet-900/20 text-violet-400 mr-4">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-white">Assessment Help</h3>
              <p className="text-zinc-400 text-sm mb-3">Get help with assessments and evaluations</p>
              <Button variant="link" className="p-0 h-auto text-violet-400 hover:text-violet-300 group">
                <span>View guides</span>
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 flex items-start">
            <div className="p-3 rounded-full bg-emerald-900/20 text-emerald-400 mr-4">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-white">Course Support</h3>
              <p className="text-zinc-400 text-sm mb-3">Learn how to get the most from courses</p>
              <Button variant="link" className="p-0 h-auto text-emerald-400 hover:text-emerald-300 group">
                <span>View guides</span>
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-amber-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-900/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-6 flex items-start">
            <div className="p-3 rounded-full bg-amber-900/20 text-amber-400 mr-4">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1 group-hover:text-white">Tips & Tricks</h3>
              <p className="text-zinc-400 text-sm mb-3">Discover advanced features and shortcuts</p>
              <Button variant="link" className="p-0 h-auto text-amber-400 hover:text-amber-300 group">
                <span>View guides</span>
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="faq" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="faq" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="guides" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Book className="h-4 w-4 mr-2" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Video className="h-4 w-4 mr-2" />
            Video Tutorials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="mt-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredFaqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border-zinc-800">
                      <AccordionTrigger className="hover:text-violet-400 hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-zinc-400">{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="p-4 rounded-full bg-zinc-800 mb-4">
                    <Search className="h-6 w-6 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No FAQs found</h3>
                  <p className="text-zinc-400 mb-4">Try adjusting your search query</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guides" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides.length > 0 ? (
              filteredGuides.map((guide, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                  <Card
                    className={`bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-${guide.color}-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-${guide.color}-900/10 overflow-hidden relative group h-full`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br from-${guide.color}-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    ></div>
                    <CardContent className="p-6 flex h-full">
                      <div className="flex flex-col h-full w-full">
                        <div className="flex items-start mb-4">
                          <div className={`p-3 rounded-full bg-${guide.color}-900/20 text-${guide.color}-400 mr-4`}>
                            {guide.icon}
                          </div>
                          <div className="flex-1">
                            <Badge className={`mb-2 bg-${guide.color}-900/30 text-${guide.color}-400`}>
                              {guide.type}
                            </Badge>
                            <h3 className="text-lg font-semibold group-hover:text-white">{guide.title}</h3>
                          </div>
                        </div>
                        <p className="text-zinc-400 text-sm mb-4 flex-grow">{guide.description}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs text-zinc-500">{guide.readTime}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Search className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No guides found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides.filter((g) => g.type === "video").length > 0 ? (
              filteredGuides
                .filter((g) => g.type === "video")
                .map((guide, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <Card
                      className={`bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-${guide.color}-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-${guide.color}-900/10 overflow-hidden relative group h-full`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br from-${guide.color}-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                      ></div>
                      <div className="relative">
                        <div className="aspect-video bg-zinc-800 rounded-t-lg overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Button
                              className={`bg-${guide.color}-600 hover:bg-${guide.color}-700 text-white rounded-full h-12 w-12 flex items-center justify-center`}
                            >
                              <Play className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="flex items-start mb-4">
                            <div className="flex-1">
                              <Badge className={`mb-2 bg-${guide.color}-900/30 text-${guide.color}-400`}>
                                {guide.type}
                              </Badge>
                              <h3 className="text-lg font-semibold group-hover:text-white">{guide.title}</h3>
                            </div>
                          </div>
                          <p className="text-zinc-400 text-sm mb-4">{guide.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-xs text-zinc-500">{guide.readTime}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Watch
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-4">
                  <Video className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No video tutorials found</h3>
                <p className="text-zinc-400 mb-4">Try adjusting your search query</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Support */}
      <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-violet-900/20 text-violet-400 mr-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Still need help?</h3>
                <p className="text-zinc-400">Our support team is ready to assist you</p>
              </div>
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700 text-white">Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
