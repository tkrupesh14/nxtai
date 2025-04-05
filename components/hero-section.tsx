"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import PromptBuilderDemo from "@/components/prompt-builder-demo"
import { motion } from "framer-motion"

export default function HeroSection() {
  const [scrollY, setScrollY] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const calculateParallax = (factor: number) => {
    if (!sectionRef.current) return 0
    const sectionTop = sectionRef.current.offsetTop
    const scrollPosition = scrollY - sectionTop
    return scrollPosition * factor
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden border-b border-zinc-800"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-black"></div>

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-900 to-black"
        style={{ transform: `translateY(${calculateParallax(0.05)}px)` }}
      ></div>

      {/* Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(255,255,255,0.05)_1px,_transparent_1px),_linear-gradient(to_bottom,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[size:4rem_4rem]"></div>

      {/* Animated Gradient Orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[100px]"
        style={{ transform: `translate(${calculateParallax(-0.1)}px, ${calculateParallax(0.05)}px)` }}
      ></div>
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px]"
        style={{ transform: `translate(${calculateParallax(0.1)}px, ${calculateParallax(-0.05)}px)` }}
      ></div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center px-3 py-1 rounded-full bg-violet-900/30 border border-violet-700/50 text-violet-400 text-sm mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              <span>Revolutionizing AI Learning</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              <span className="inline-block relative">
                <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">
                  Master the Art of <br />
                  Prompt Engineering
                </span>
                <span className="absolute -inset-1 bg-gradient-to-r from-violet-400/20 to-emerald-400/20 blur-xl opacity-50 z-0"></span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-xl mb-8 text-zinc-400 max-w-xl"
            >
              Skip the courses. Jump straight into AI-powered assessments and learn by doing. Transform how you
              communicate with AI models.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden">
                <span className="relative z-10 flex items-center">
                  Start Assessment
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-violet-600 to-violet-500"></span>
                <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 transition-all duration-300 group-hover:h-full"></span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 group relative overflow-hidden"
              >
                <span className="relative z-10">Explore Platform</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-violet-500 transition-all duration-300 group-hover:w-full"></span>
              </Button>
            </motion.div>
          </motion.div>

          
            <PromptBuilderDemo />
          
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
      >
        <span className="text-zinc-500 text-sm mb-2">Scroll to discover</span>
        <div className="w-6 h-10 border-2 border-zinc-700 rounded-full flex justify-center">
          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce mt-2"></div>
        </div>
      </motion.div>
    </section>
  )
}

