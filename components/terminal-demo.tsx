"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { motion } from "framer-motion"

export default function TerminalDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [displayedText, setDisplayedText] = useState("")
  const [showCursor, setShowCursor] = useState(true)
  const terminalRef = useRef<HTMLDivElement>(null)

  const conversation = [
    {
      role: "system",
      content: '> Welcome to NxtAI Prompt Engineering Terminal\n> Type a prompt to begin or press "Run Demo"',
    },
    {
      role: "user",
      content: "Create a detailed image of a futuristic city with flying cars and neon lights",
    },
    {
      role: "system",
      content:
        "> Analyzing prompt structure...\n> Prompt clarity: 72%\n> Specificity: 65%\n> Suggested improvement: Add details about time of day, weather conditions, and architectural style",
    },
    {
      role: "user",
      content:
        "Create a detailed image of a futuristic cyberpunk city at night during a light rain, with flying cars, neon signs in blue and purple, and tall skyscrapers with holographic advertisements",
    },
    {
      role: "system",
      content:
        "> Analyzing prompt structure...\n> Prompt clarity: 94%\n> Specificity: 89%\n> Excellent prompt! The added details about time, weather, colors, and specific elements will produce a much more precise result.\n> AI would generate image based on these specific parameters.",
    },
  ]

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(cursorInterval)
  }, [])

  useEffect(() => {
    if (currentStep < conversation.length && conversation[currentStep].role === "system") {
      typeText(conversation[currentStep].content)
    }
  }, [currentStep])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [displayedText])

  const typeText = (text: string) => {
    setIsTyping(true)
    setDisplayedText("")

    let i = 0
    const typing = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i))
        i++
      } else {
        clearInterval(typing)
        setIsTyping(false)

        // Auto advance to next step after a delay if it's not the last step
        if (currentStep < conversation.length - 1) {
          const timer = setTimeout(() => {
            setCurrentStep((prev) => prev + 1)
          }, 1000)
          return () => clearTimeout(timer)
        }
      }
    }, 20)

    return () => clearInterval(typing)
  }

  const handleRunDemo = () => {
    if (currentStep === 0) {
      setCurrentStep(1)
    }
  }

  const handleSubmit = () => {
    if (inputValue.trim() && !isTyping) {
      // In a real app, you would process the input here
      setInputValue("")
      // For demo purposes, we'll just advance to the next step
      if (currentStep < conversation.length - 1) {
        setCurrentStep((prev) => prev + 1)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  // Matrix-like background effect
  const MatrixBackground = () => {
    const [matrixChars, setMatrixChars] = useState<string[][]>([])
  
    useEffect(() => {
      const chars = Array.from({ length: 10 }).map(() =>
        Array.from({ length: 30 }).map(
          () => String.fromCharCode(33 + Math.floor(Math.random() * 94))
        )
      )
      setMatrixChars(chars)
    }, [])
  
    return (
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <div className="absolute top-0 left-0 right-0 bottom-0 flex">
          {matrixChars.map((col, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center text-emerald-500 text-xs opacity-50"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {col.map((char, j) => (
                <div
                  key={j}
                  className="animate-matrix-fall"
                  style={{
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${Math.random() * 5 + 5}s`,
                  }}
                >
                  {char}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl overflow-hidden relative">
        {/* Terminal Header */}
        <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between border-b border-zinc-700 relative z-10">
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
          <div className="text-xs text-zinc-400 font-mono">NxtAI Prompt Engineering Terminal</div>
          <div className="w-4"></div>
        </div>

        {/* Terminal Content */}
        <div className="bg-zinc-950 p-4 h-80 overflow-y-auto font-mono text-sm relative" ref={terminalRef}>
          <MatrixBackground />

          {/* Display previous conversation */}
          {conversation.slice(0, currentStep).map((message, index) => (
            <motion.div
              key={index}
              className="mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {message.role === "user" ? (
                <div className="text-emerald-400">
                  <span className="text-zinc-500">user@nxtai:~$</span> {message.content}
                </div>
              ) : (
                <div className="text-violet-400 whitespace-pre-line">{message.content}</div>
              )}
            </motion.div>
          ))}

          {/* Current system message being typed */}
          {currentStep < conversation.length && conversation[currentStep].role === "system" && (
            <div className="text-violet-400 whitespace-pre-line">
              {displayedText}
              {isTyping && showCursor && <span className="text-white">▋</span>}
            </div>
          )}

          {/* Current user message */}
          {currentStep < conversation.length && conversation[currentStep].role === "user" && (
            <motion.div
              className="text-emerald-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-zinc-500">user@nxtai:~$</span> {conversation[currentStep].content}
            </motion.div>
          )}
        </div>

        {/* Terminal Input */}
        <div className="bg-zinc-900 px-4 py-3 border-t border-zinc-800 flex items-center relative z-10">
          <span className="text-zinc-500 mr-2 text-sm font-mono">user@nxtai:~$</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none text-sm font-mono"
            placeholder="Type your prompt..."
            disabled={isTyping || currentStep !== 0}
          />
          <Button
            size="sm"
            className="ml-2 bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden"
            onClick={currentStep === 0 ? handleRunDemo : handleSubmit}
            disabled={isTyping || (currentStep !== 0 && !inputValue.trim())}
          >
            <span className="relative z-10">{currentStep === 0 ? "Run Demo" : <Send className="h-4 w-4" />}</span>
            <span className="absolute inset-0 w-full h-0 bg-violet-500 transition-all duration-300 group-hover:h-full"></span>
          </Button>
        </div>
      </div>

      {/* Terminal Shadow and Glow Effect */}
      <div className="h-2 bg-gradient-to-r from-violet-500/20 via-emerald-500/20 to-rose-500/20 rounded-b-lg blur-sm"></div>
      <div className="absolute -inset-40 bg-violet-500/5 rounded-full blur-3xl opacity-30 animate-pulse"></div>
    </motion.div>
  )
}

