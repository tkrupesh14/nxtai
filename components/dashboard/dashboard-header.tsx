"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  HelpCircle,
  ChevronDown,
  X,
  Sun,
  Moon,
  Sparkles,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export default function DashboardHeader({
  user,
  avatarFallback,
}: {
  user: { full_name: string; avatar_url?: string }
  avatarFallback: string
}) {
  const [notifications] = useState([
    {
      id: 1,
      title: "Assessment Reminder",
      message: 'Your "Advanced Prompt Structuring" assessment is due in 2 days.',
      time: "1 hour ago",
      read: false,
      type: "assessment",
    },
    {
      id: 2,
      title: "New Course Available",
      message: 'Check out our new course on "AI for Data Analysis".',
      time: "3 hours ago",
      read: false,
      type: "course",
    },
    {
      id: 3,
      title: "Achievement Unlocked",
      message: 'Congratulations! You\'ve earned the "Consistent Learner" badge.',
      time: "1 day ago",
      read: true,
      type: "achievement",
    },
  ])

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const unreadCount = notifications.filter((n) => !n.read).length
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the '/' key is pressed and no input or textarea is focused
      const tagName = document.activeElement?.tagName
if (event.key === '/' && tagName && !['INPUT', 'TEXTAREA'].includes(tagName)) {
  event.preventDefault()
  setIsSearchOpen(true)
}
    }
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen])

  // Handle search
  useEffect(() => {
    if (searchQuery.length > 1) {
      // Mock search results
      const results = [
        {
          type: "assessment",
          title: "Advanced Prompt Structuring",
          href: "/dashboard/assessments/1",
        },
        {
          type: "course",
          title: "AI for Creative Writing",
          href: "/dashboard/courses/2",
        },
        {
          type: "help",
          title: "How to optimize prompts for better results",
          href: "/dashboard/help/prompt-optimization",
        },
      ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))

      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  // Close search on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };
  
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "assessment":
        return <Zap className="h-4 w-4 text-violet-400" />
      case "course":
        return <Sparkles className="h-4 w-4 text-emerald-400" />
      case "achievement":
        return <Sparkles className="h-4 w-4 text-amber-400" />
      default:
        return <Bell className="h-4 w-4 text-zinc-400" />
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Search Trigger */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 md:mr-2"
          >
            <Search className="h-5 w-5" />
          </Button>

          <div className="hidden md:flex items-center">
            <span className="text-sm font-medium text-zinc-400">Press</span>
            <kbd className="ml-1 px-1.5 py-0.5 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
              /
            </kbd>
            <span className="ml-1 text-sm font-medium text-zinc-400">to search</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">Light</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">Dark</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800 relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-zinc-900"></span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-900 border-zinc-800">
              <SheetHeader>
                <SheetTitle>Notifications</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg ${
                      notification.read ? "bg-zinc-800/50" : "bg-zinc-800 border-l-2 border-violet-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="p-1.5 rounded-full bg-zinc-700 mr-3 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          <p className="text-xs text-zinc-400 mt-1">{notification.message}</p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">{notification.time}</span>
                    </div>
                  </div>
                ))}

                <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">View All Notifications</Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name || 'User'} />
                                <AvatarFallback className="bg-violet-900 text-violet-100">{avatarFallback}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium">{user.full_name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuGroup>
                <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <Link href="/dashboard/profile" className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <Link href="/dashboard/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer text-rose-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Global Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <Input
                  placeholder="Search for assessments, courses, help..."
                  className="pl-12 pr-12 py-6 bg-transparent border-0 border-b border-zinc-700 rounded-none text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchQuery}
                  ref={searchInputRef}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                  onClick={() => setIsSearchOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto p-4">
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <Link
                        key={index}
                        href={result.href}
                        className="flex items-center p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                        onClick={() => setIsSearchOpen(false)}
                      >
                        <div className="p-2 rounded-full bg-zinc-800 mr-3">
                          {result.type === "assessment" && <Zap className="h-4 w-4 text-violet-400" />}
                          {result.type === "course" && <Sparkles className="h-4 w-4 text-emerald-400" />}
                          {result.type === "help" && <HelpCircle className="h-4 w-4 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{result.title}</p>
                          <p className="text-xs text-zinc-500 capitalize">{result.type}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-zinc-400">No results found for "{searchQuery}"</p>
                </div>
              )}

              {!searchQuery && <div className="p-4 text-center text-zinc-500 text-sm">Start typing to search...</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
