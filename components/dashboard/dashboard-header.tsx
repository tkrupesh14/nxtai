"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Search, User, Settings, LogOut, HelpCircle, ChevronDown } from "lucide-react"
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

export default function DashboardHeader() {
  const [notifications] = useState([
    {
      id: 1,
      title: "Assessment Reminder",
      message: 'Your "Advanced Prompt Structuring" assessment is due in 2 days.',
      time: "1 hour ago",
      read: false,
    },
    {
      id: 2,
      title: "New Course Available",
      message: 'Check out our new course on "AI for Data Analysis".',
      time: "3 hours ago",
      read: false,
    },
    {
      id: 3,
      title: "Achievement Unlocked",
      message: 'Congratulations! You\'ve earned the "Consistent Learner" badge.',
      time: "1 day ago",
      read: true,
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <header className="sticky top-0 z-30 bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Search */}
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Search..." className="pl-9 bg-zinc-800 border-zinc-700 focus:border-violet-500" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center ml-auto space-x-4">
          {/* Help */}
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-zinc-800 relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-violet-500"></span>}
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
                    className={`p-3 rounded-lg ${notification.read ? "bg-zinc-800/50" : "bg-zinc-800 border-l-2 border-violet-500"}`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium">{notification.title}</h4>
                      <span className="text-xs text-zinc-500">{notification.time}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{notification.message}</p>
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
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                  <AvatarFallback className="bg-violet-900 text-violet-100">AJ</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium">Alex Johnson</span>
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
    </header>
  )
}

