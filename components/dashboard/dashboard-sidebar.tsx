"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  Zap,
  BookOpen,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  HelpCircle,
  Award,
  BarChart,
  Bookmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

export default function DashboardHeader({
  user,
  avatarFallback,
}: {
  user: { full_name: string; avatar_url?: string }
  avatarFallback: string
}) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const mainNavItems = [
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
  ]

  const secondaryNavItems = [
    {
      name: "Analytics",
      href: "/dashboard/analytics",
      icon: <BarChart className="h-5 w-5" />,
    },
    {
      name: "Achievements",
      href: "/dashboard/achievements",
      icon: <Award className="h-5 w-5" />,
    },
    {
      name: "Bookmarks",
      href: "/dashboard/bookmarks",
      icon: <Bookmark className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      name: "Help Center",
      href: "/dashboard/help",
      icon: <HelpCircle className="h-5 w-5" />,
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
          className="bg-zinc-900/80 backdrop-blur-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={`fixed md:sticky top-0 left-0 h-screen z-50 transition-all duration-300 ${
          isExpanded ? "w-64" : "w-20"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        animate={{ width: isExpanded ? 256 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="h-full flex flex-col bg-zinc-900/90 backdrop-blur-md border-r border-zinc-800 overflow-hidden">
          {/* Logo */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-emerald-500 rounded-md blur opacity-60"></div>
                <div className="absolute inset-0 bg-zinc-900 rounded-md flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </div>
              </div>
              {isExpanded && <span className="font-bold text-xl">NxtAI</span>}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 hidden md:flex"
            >
              <ChevronRight className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* User Profile */}
          <div
            className={`p-4 border-b border-zinc-800 ${isExpanded ? "flex items-center" : "flex flex-col items-center"}`}
          >
            <Avatar className={`${isExpanded ? "h-10 w-10" : "h-10 w-10"} border-2 border-violet-500`}>
            <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name || 'User'} />
              <AvatarFallback className="bg-violet-900 text-violet-100">{avatarFallback}</AvatarFallback>
            </Avatar>

            {isExpanded && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-zinc-400 truncate">Level 4 • Prompt Engineer</p>
                <div className="mt-1.5">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">Level Progress</span>
                    <span className="text-zinc-300">65%</span>
                  </div>
                  <Progress value={65} className="h-1 bg-zinc-800">
                    <div className="h-full bg-violet-500" style={{ width: "65%" }} />
                  </Progress>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto custom-scrollbar py-4">
            <nav className="px-3 space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                      isExpanded ? "" : "justify-center"
                    } ${isActive ? "text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/70"}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 right-0 top-0 bottom-0 bg-violet-900/20 border-l-2 border-violet-500 rounded-md -z-10"
                        transition={{ type: "spring", duration: 0.5 }}
                      />
                    )}
                    <span className="flex-shrink-0">{item.icon}</span>
                    {isExpanded && <span className="ml-3">{item.name}</span>}
                  </Link>
                )
              })}
            </nav>

            {isExpanded && (
              <div className="mt-6 px-3">
                <div className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">More</div>
                <nav className="mt-2 space-y-1">
                  {secondaryNavItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                          isActive ? "text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/70"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-secondary-indicator"
                            className="absolute left-0 right-0 top-0 bottom-0 bg-zinc-800/70 rounded-md -z-10"
                            transition={{ type: "spring", duration: 0.5 }}
                          />
                        )}
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="ml-3">{item.name}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-zinc-800">
            <Button
              variant="outline"
              className={`w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white ${
                isExpanded ? "justify-start" : "justify-center"
              }`}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              {isExpanded && <span className="ml-2">Log Out</span>}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
