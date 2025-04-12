'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  name: string
  timeString: string
  greeting: string
}

export default function WelcomeBannerClient({ name, timeString, greeting }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-gradient-to-r from-zinc-900/90 via-zinc-900/80 to-zinc-900/90 backdrop-blur-sm"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="bg-violet-900/30 border border-violet-700/50 text-violet-400 rounded-full px-3 py-1 text-xs flex items-center">
              <Sparkles className="h-3 w-3 mr-1.5" />
              <span>{timeString}</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {greeting}, <span className="text-violet-400">{name}</span>
          </h1>
          <p className="text-zinc-400 max-w-xl">
            Ready to continue your learning journey? You're making great progress on your assessments and courses.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white group relative overflow-hidden">
            <span className="relative z-10 flex items-center">
              Continue Learning
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Button>
          <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            View Recommendations
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
