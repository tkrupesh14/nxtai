"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Brain, Zap, Code, Lightbulb, ChevronRight, Star, Github } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    const text = "Welcome to NxtAI: Unleash Your AI Potential!"
    setPrompt(text)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e5,#3b82f6,#06b6d4)] opacity-20 animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#000_80%)] mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000_0,#000_1px,transparent_1px,transparent_4px)] opacity-20"></div>
      </div>

      <div className="relative z-10">
        <header className="p-6 flex justify-between items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold flex items-center"
          >
            <Sparkles className="mr-2 text-blue-400" /> NxtAI
          </motion.div>
          <nav>
            <button className="px-4 py-2 text-gray-300 hover:text-white mr-4">Login</button>
            <button className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-800 hover:text-white">Sign Up</button>
          </nav>
        </header>

        <main className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              {prompt}
              {isTyping && <span className="animate-pulse">|</span>}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300">Master the art of crafting perfect prompts and harness the power of AI</p>
            <div className="flex justify-center">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300 flex items-center">
                Start Your Journey <ChevronRight className="ml-2" />
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Brain, title: "Interactive Lessons", color: "text-purple-400" },
              { icon: Zap, title: "Real-time Feedback", color: "text-yellow-400" },
              { icon: Code, title: "AI-powered Challenges", color: "text-green-400" },
              { icon: Lightbulb, title: "Creative Workshops", color: "text-pink-400" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl p-6 hover:bg-opacity-70 transition-all duration-300 border border-gray-700"
              >
                <feature.icon className={`text-4xl mb-4 ${feature.color}`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Ready to become a Prompt Engineering Master?</h2>
            <div className="space-x-4">
              <button className="px-6 py-3 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 hover:text-white transition-colors duration-300">
                Explore Hands-ons
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                Join For Free
              </button>
            </div>
          </motion.div>
        </main>

        {/* Floating GitHub Stars Button */}
        <a 
          href="https://github.com/tkrupesh14/nxtai" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="fixed bottom-6 right-6 p-3 bg-gray-800 rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-300 flex items-center justify-center"
        >
          <Github />
        </a>

        <footer className="mt-20 py-8 text-center text-sm text-gray-500">
          <p>&copy; 2024 PromptMaster. All rights reserved.</p>
          <div className="mt-2">
            <Link href="#" className="hover:text-gray-300 mr-4">Terms of Service</Link>
            <Link href="#" className="hover:text-gray-300 mr-4">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-300">Contact Us</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
