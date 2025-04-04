"use client"

import { useState, useEffect } from "react"
import { CheckCircle, ChevronRight, Brain, Target, Award } from "lucide-react"
import { motion } from "framer-motion"

export default function AIPathway() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const steps = [
    {
      title: "AI Assessment",
      description: "Take an initial assessment to evaluate your current prompt engineering skills.",
      icon: <Target className="h-6 w-6" />,
      color: "violet",
    },
    {
      title: "Personalized Path",
      description: "Our AI analyzes your strengths and weaknesses to create a custom learning journey.",
      icon: <Brain className="h-6 w-6" />,
      color: "emerald",
    },
    {
      title: "Interactive Challenges",
      description: "Complete hands-on challenges with real-time feedback from our AI system.",
      icon: <ChevronRight className="h-6 w-6" />,
      color: "rose",
    },
    {
      title: "Skill Mastery",
      description: "Master specific prompt engineering techniques through targeted practice.",
      icon: <CheckCircle className="h-6 w-6" />,
      color: "amber",
    },
    {
      title: "Certification",
      description: "Earn credentials that demonstrate your prompt engineering expertise.",
      icon: <Award className="h-6 w-6" />,
      color: "blue",
    },
  ]

  const getStepColor = (index: number, color: string) => {
    if (index === activeStep) {
      switch (color) {
        case "violet":
          return "text-violet-400 border-violet-400 bg-violet-900/20"
        case "emerald":
          return "text-emerald-400 border-emerald-400 bg-emerald-900/20"
        case "rose":
          return "text-rose-400 border-rose-400 bg-rose-900/20"
        case "amber":
          return "text-amber-400 border-amber-400 bg-amber-900/20"
        case "blue":
          return "text-blue-400 border-blue-400 bg-blue-900/20"
        default:
          return "text-violet-400 border-violet-400 bg-violet-900/20"
      }
    }
    return "text-zinc-500 border-zinc-700 bg-zinc-800/50"
  }

  const getLineColor = (index: number, color: string) => {
    if (index === activeStep) {
      switch (color) {
        case "violet":
          return "border-violet-400"
        case "emerald":
          return "border-emerald-400"
        case "rose":
          return "border-rose-400"
        case "amber":
          return "border-amber-400"
        case "blue":
          return "border-blue-400"
        default:
          return "border-violet-400"
      }
    }
    return "border-zinc-700"
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="flex items-start space-x-4 mb-8 last:mb-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: index === activeStep ? 1 : 0.5,
              x: 0,
              scale: index === activeStep ? 1 : 0.98,
            }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${getStepColor(index, step.color)}`}
              animate={{
                scale: index === activeStep ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 0.5,
                repeat: index === activeStep ? Number.POSITIVE_INFINITY : 0,
                repeatDelay: 2,
              }}
            >
              {step.icon}
            </motion.div>
  
            <div>
              <motion.h3
                className={`text-2xl font-semibold mb-1 ${index === activeStep ? `text-${step.color}-400` : "text-white"}`}
              >
                {step.title}
              </motion.h3>
              <motion.p className="text-zinc-400 text-base">
                {step.description}
              </motion.p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
  
}

