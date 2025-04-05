"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { LayoutDashboard, Zap, BookOpen, User, Settings, LogOut, Menu, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Assessments",
      href: "/dashboard/assessments",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      name: "Courses",
      href: "/dashboard/courses",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      name: "Profile",
      href: "/dashboard/profile",
      icon: <User className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 bg-black/80 z-40 md:hidden transition-opacity duration-300 ${
          isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-zinc-900 border-r border-zinc-800 z-50 transition-transform duration-300 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800 flex items-center">
          <div className="relative w-8 h-8 mr-2">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-emerald-500 rounded-md blur opacity-60"></div>
            <div className="absolute inset-0 bg-zinc-900 rounded-md flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
          </div>
          <span className="font-bold text-xl">NxtAI</span>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  isActive ? "text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
                onClick={() => setIsMobileOpen(false)}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 right-0 top-0 bottom-0 bg-violet-900/20 border-l-2 border-violet-500 rounded-md -z-10"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
          <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 justify-start">
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </div>
    </>
  )
}

