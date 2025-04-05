"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  ChevronRight,
  ImageIcon,
  MessageSquare,
  Code,
  PenTool,
} from "lucide-react"

export default function PromptBuilderDemo() {
  const [step, setStep] = useState(0)
  const [promptQuality, setPromptQuality] = useState(35)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [promptText, setPromptText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typedText, setTypedText] = useState("")
  const [cursorPosition, setCursorPosition] = useState(0)

  // Sample prompt templates
  const promptTemplates = [
    {
      title: "Image Generation",
      icon: <ImageIcon className="h-4 w-4" />,
      template: "Create an image of a futuristic city with flying cars",
      tags: ["detailed", "realistic", "vibrant", "cinematic", "4k"],
    },
    {
      title: "Text Completion",
      icon: <MessageSquare className="h-4 w-4" />,
      template: "Write a short story about a robot learning to feel emotions",
      tags: ["creative", "emotional", "narrative", "detailed", "twist"],
    },
    {
      title: "Code Generation",
      icon: <Code className="h-4 w-4" />,
      template: "Write a function that calculates the Fibonacci sequence",
      tags: ["efficient", "commented", "python", "recursive", "optimized"],
    },
    {
      title: "Creative Writing",
      icon: <PenTool className="h-4 w-4" />,
      template: "Write a poem about the changing seasons",
      tags: ["metaphorical", "vivid", "structured", "emotional", "nature"],
    },
  ]

  // Current template
  const [currentTemplate, setCurrentTemplate] = useState(promptTemplates[0])

  // Feedback based on prompt quality
  const getFeedback = () => {
    if (promptQuality < 40) {
      return {
        score: "Low",
        color: "rose",
        icon: <AlertCircle className="h-4 w-4" />,
        feedback: "Your prompt lacks specificity and detail. Try adding more context and clear instructions.",
        suggestions: [
          "Add more specific details about what you want",
          "Specify style, mood, or aesthetic preferences",
          "Include technical parameters like resolution or format",
        ],
      }
    } else if (promptQuality < 70) {
      return {
        score: "Medium",
        color: "amber",
        icon: <Lightbulb className="h-4 w-4" />,
        feedback: "Your prompt has good elements but could be more specific and structured.",
        suggestions: [
          "Add more descriptive adjectives",
          "Specify the perspective or viewpoint",
          "Include references or examples of the style you want",
        ],
      }
    } else {
      return {
        score: "High",
        color: "emerald",
        icon: <Check className="h-4 w-4" />,
        feedback: "Excellent prompt! Clear, specific, and well-structured.",
        suggestions: [
          "Your prompt is well-crafted",
          "Consider adding negative prompts to avoid unwanted elements",
          "Try variations to explore different outcomes",
        ],
      }
    }
  }

  // Type animation effect
  useEffect(() => {
    if (isTyping && cursorPosition < promptText.length) {
      const timer = setTimeout(() => {
        setTypedText((prev) => prev + promptText.charAt(cursorPosition))
        setCursorPosition((prev) => prev + 1)
      }, 30)
      return () => clearTimeout(timer)
    } else if (cursorPosition >= promptText.length) {
      setIsTyping(false)
    }
  }, [isTyping, cursorPosition, promptText])

  // Handle template change
  const changeTemplate = (template: typeof currentTemplate) => {
    setCurrentTemplate(template)
    setSelectedTags([])
    setPromptText(template.template)
    setTypedText("")
    setCursorPosition(0)
    setIsTyping(true)
    setPromptQuality(35)
    setShowFeedback(false)
  }

  // Handle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  // Update prompt quality based on tags and text
  useEffect(() => {
    if (selectedTags.length > 0) {
      // More tags = better quality (up to a point)
      const baseQuality = 35
      const tagBonus = Math.min(selectedTags.length * 12, 50)
      setPromptQuality(baseQuality + tagBonus)
    }
  }, [selectedTags])

  // Handle analyze button click
  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setShowFeedback(true)
    }, 1500)
  }

  // Reset the demo
  const handleReset = () => {
    setStep(0)
    setSelectedTags([])
    setPromptQuality(35)
    setShowFeedback(false)
    setTypedText("")
    setCursorPosition(0)
    setIsTyping(true)
  }

  // Enhanced prompt with tags
  const getEnhancedPrompt = () => {
    if (selectedTags.length === 0) return promptText

    return `${promptText}. Style: ${selectedTags.join(", ")}.`
  }

  return (
    
      <div className="bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-800 px-4 py-3 flex items-center justify-between border-b border-zinc-700">
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-3 h-3 rounded-full bg-rose-500"
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            ></motion.div>
            <motion.div
              className="w-3 h-3 rounded-full bg-amber-500"
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            ></motion.div>
            <motion.div
              className="w-3 h-3 rounded-full bg-emerald-500"
              whileHover={{ scale: 1.2 }}
              transition={{ duration: 0.2 }}
            ></motion.div>
          </div>
          <div className="text-xs text-zinc-400 font-mono flex items-center">
            <Sparkles className="h-3 w-3 mr-1.5 text-violet-400" />
            NxtAI Prompt Builder
          </div>
          <div className="w-4"></div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Template Selector */}
          <div className="mb-6">
            <div className="text-sm text-zinc-400 mb-2">Select a prompt template:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {promptTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={`border-zinc-700 hover:border-violet-500 hover:bg-zinc-800 justify-start ${
                    currentTemplate.title === template.title ? "bg-zinc-800 border-violet-500" : ""
                  }`}
                  onClick={() => changeTemplate(template)}
                >
                  <span className="mr-2">{template.icon}</span>
                  <span className="truncate">{template.title}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="mb-6">
            <div className="text-sm text-zinc-400 mb-2">Your prompt:</div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-md p-4 h-24 overflow-y-auto font-mono text-sm">
              {isTyping ? (
                <>
                  <span className="text-emerald-400">{typedText}</span>
                  <span className="animate-pulse">▋</span>
                </>
              ) : (
                <span className="text-emerald-400">{getEnhancedPrompt()}</span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <div className="text-sm text-zinc-400 mb-2">Enhance your prompt with tags:</div>
            <div className="flex flex-wrap gap-2">
              {currentTemplate.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`cursor-pointer border-zinc-700 hover:border-violet-500 ${
                    selectedTags.includes(tag)
                      ? "bg-violet-900/30 border-violet-500 text-violet-300"
                      : "bg-zinc-900 text-zinc-400"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {selectedTags.includes(tag) && <Check className="h-3 w-3 mr-1" />}
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quality Meter */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-zinc-400">Prompt quality:</div>
              <div
                className={`text-xs font-medium ${
                  promptQuality < 40 ? "text-rose-400" : promptQuality < 70 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {promptQuality}%
              </div>
            </div>
            <Slider value={[promptQuality]} max={100} step={1} disabled className="cursor-default" />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <div>Basic</div>
              <div>Good</div>
              <div>Excellent</div>
            </div>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 overflow-hidden"
              >
                <div
                  className={`rounded-md border p-4 ${
                    promptQuality < 40
                      ? "border-rose-800/50 bg-rose-900/10"
                      : promptQuality < 70
                        ? "border-amber-800/50 bg-amber-900/10"
                        : "border-emerald-800/50 bg-emerald-900/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-full ${
                        promptQuality < 40
                          ? "bg-rose-900/50 text-rose-400"
                          : promptQuality < 70
                            ? "bg-amber-900/50 text-amber-400"
                            : "bg-emerald-900/50 text-emerald-400"
                      }`}
                    >
                      {getFeedback().icon}
                    </div>
                    <div>
                      <div className="font-medium flex items-center">
                        <span
                          className={
                            promptQuality < 40
                              ? "text-rose-400"
                              : promptQuality < 70
                                ? "text-amber-400"
                                : "text-emerald-400"
                          }
                        >
                          {getFeedback().score} Quality
                        </span>
                        <span className="mx-2 text-zinc-500">•</span>
                        <span className="text-sm text-zinc-400">Score: {promptQuality}%</span>
                      </div>
                      <p className="text-sm text-zinc-300 mt-1">{getFeedback().feedback}</p>
                    </div>
                  </div>
                  <div className="mt-3 pl-9">
                    <p className="text-xs text-zinc-400 mb-2">Suggestions:</p>
                    <ul className="space-y-1">
                      {getFeedback().suggestions.map((suggestion, index) => (
                        <li key={index} className="text-xs text-zinc-300 flex items-start">
                          <ChevronRight className="h-3 w-3 mr-1 mt-0.5 text-zinc-500" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isTyping}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze Prompt
                  </>
                )}
              </span>
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
              <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
            </Button>
            <Button onClick={handleReset} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

  )
}

