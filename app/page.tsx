import Link from "next/link"
import { ArrowRight, Brain, Command, Cpu, Fingerprint, Terminal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import HeroSection from "@/components/hero-section"
import AssessmentCard from "@/components/assessment-card"
import FeatureHighlight from "@/components/feature-highlight"
import AIPathway from "@/components/ai-pathway"
import FloatingParticles from "@/components/floating-particles"
import ScrollReveal from "@/components/scroll-reveal"
import AnimatedBackground from "@/components/animated-background"
import AnimatedStats from "@/components/animated-stats"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black text-white overflow-hidden">
      {/* Hero Section with Animated Background */}
      <HeroSection />

      {/* Animated Stats Section */}
      <section className="py-16 bg-zinc-900/50 relative overflow-hidden border-y border-zinc-800/50">
        <AnimatedBackground />
        <div className="container mx-auto px-4 relative z-10">
          <AnimatedStats />
        </div>
      </section>

      {/* Assessment First Approach */}
      <section className="py-24 bg-zinc-900/80 relative overflow-hidden">
        <FloatingParticles count={15} color="emerald" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 text-sm mb-6">
                <Zap className="h-3.5 w-3.5 mr-2" />
                <span>Assessment-First Learning</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Skip the Lectures. <span className="text-emerald-400">Learn by Doing.</span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                NxtAI's assessment-first approach lets you jump straight into practical prompt engineering challenges
                with real-time AI feedback.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal delay={0.1}>
              <AssessmentCard
                icon={<Terminal className="h-8 w-8 text-emerald-400" />}
                title="Prompt Crafting Challenge"
                description="Test your ability to create effective prompts for various AI tasks and receive instant feedback."
                difficulty="Beginner"
                estimatedTime="15 min"
                color="emerald"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <AssessmentCard
                icon={<Cpu className="h-8 w-8 text-violet-400" />}
                title="Advanced LLM Interaction"
                description="Solve complex problems by crafting precise prompts for specialized AI tasks."
                difficulty="Intermediate"
                estimatedTime="25 min"
                color="violet"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <AssessmentCard
                icon={<Command className="h-8 w-8 text-rose-400" />}
                title="AI System Design"
                description="Design prompt systems that work together to accomplish complex multi-step tasks."
                difficulty="Advanced"
                estimatedTime="40 min"
                color="rose"
              />
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.4}>
            <div className="mt-12 text-center">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center">
                  View All Assessments
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 group-hover:opacity-0 transition-opacity duration-300"></span>
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent"></div>
        <FloatingParticles count={10} color="violet" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-violet-900/30 border border-violet-700/50 text-violet-400 text-sm mb-6">
                <Brain className="h-3.5 w-3.5 mr-2" />
                <span>AI-Powered Learning</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Your <span className="text-violet-400">AI-Guided</span> Learning Journey
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                NxtAI adapts to your skill level and learning style, creating a personalized path to mastery.
              </p>
            </div>
          </ScrollReveal>

          <AIPathway />
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-zinc-900/80 relative overflow-hidden">
        <FloatingParticles count={15} color="rose" />
        <div className="container mx-auto px-4 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-rose-900/30 border border-rose-700/50 text-rose-400 text-sm mb-6">
                <Fingerprint className="h-3.5 w-3.5 mr-2" />
                <span>Unique Capabilities</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Not Your Typical <span className="text-rose-400">Learning Platform</span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Discover what makes NxtAI different from traditional learning management systems.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <ScrollReveal delay={0.1}>
              <FeatureHighlight
                title="Real-time AI Feedback"
                description="Get immediate, personalized feedback on your prompts from our advanced AI system that identifies patterns and suggests improvements."
                image="/feature1.png"
                color="violet"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <FeatureHighlight
                title="Adaptive Learning Paths"
                description="Our AI analyzes your strengths and weaknesses to create custom learning paths that evolve as your skills improve."
                image="/feature2.png"
                color="emerald"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <FeatureHighlight
                title="Interactive Challenges"
                description="Solve real-world prompt engineering problems in our interactive environment with immediate execution and visualization."
                image="/feature3.png"
                color="rose"
              />
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <FeatureHighlight
                title="AI Mentor Support"
                description="Get guidance from our AI mentors whenever you're stuck, with the option to connect with human experts for advanced challenges."
                image="/feature4.png"
                color="amber"
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 to-black"></div>
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=600&width=1200')] bg-cover bg-center opacity-10"></div>
        <FloatingParticles count={20} color="violet" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Master AI Communication?</h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-zinc-300">
              Start with an assessment today and begin your journey toward becoming a prompt engineering expert.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-violet-900 hover:bg-zinc-100 group relative overflow-hidden">
                <span className="relative z-10 flex items-center">
                  Take Your First Assessment
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute bottom-0 left-0 w-full h-0 bg-gradient-to-r from-violet-200 to-white transition-all duration-300 group-hover:h-full"></span>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 group">
                <span className="relative z-10 flex items-center">
                  Explore Learning Paths
                  <span className="ml-2 h-px w-4 bg-current transition-all duration-300 group-hover:w-6"></span>
                </span>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-zinc-400 py-12 border-t border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4 text-white">NxtAI</h3>
              <p className="text-zinc-500">
                Revolutionizing how people learn to communicate with AI through assessment-first learning.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-zinc-300">Assessments</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Beginner Challenges
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Intermediate Tasks
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Advanced Projects
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Specialized Domains
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-zinc-300">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    AI Prompt Library
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-zinc-300">Connect</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-violet-400 transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-500">
            <p>&copy; {new Date().getFullYear()} NxtAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}

