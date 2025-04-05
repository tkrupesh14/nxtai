import type React from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import FloatingParticles from "@/components/floating-particles"
import Navbar from "@/components/navbar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
    <Navbar />
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden py-12">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-900 to-black"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(255,255,255,0.05)_1px,_transparent_1px),_linear-gradient(to_bottom,_rgba(255,255,255,0.05)_1px,_transparent_1px)] bg-[size:4rem_4rem]"></div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px]"></div>

        <FloatingParticles count={20} color="violet" />

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-4 text-zinc-500 text-sm">
        <div className="container mx-auto px-4 text-center">
          &copy; {new Date().getFullYear()} NxtAI. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

