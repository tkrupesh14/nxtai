"use client"

import { Badge } from "@/components/ui/badge"

import { Separator } from "@/components/ui/separator"

import { useState,useEffect } from "react"
import { motion } from "framer-motion"
import { Save, Loader2, Bell, Shield, User, Palette, Globe, Mail, Lock, Smartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function SettingsPage({user}) {



    
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-zinc-400">Manage your account preferences and settings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Button onClick={handleSave} disabled={isLoading} className="bg-violet-600 hover:bg-violet-700 text-white">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
          <TabsTrigger value="account" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    defaultValue="Alex"
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    defaultValue="Johnson"
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="alex.johnson@example.com"
                  className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  value={user.user_metadata.email}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  defaultValue="alexjohnson"
                  className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  rows={4}
                  className="w-full rounded-md bg-zinc-800 border border-zinc-700 p-3 text-sm focus:border-violet-500 focus:outline-none"
                  defaultValue="Prompt engineering enthusiast with a background in AI and machine learning. Looking to improve my skills and connect with others in the field."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 focus:border-emerald-500">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="utc-8">
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 focus:border-emerald-500">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="utc-12">UTC-12:00</SelectItem>
                    <SelectItem value="utc-8">UTC-08:00 (Pacific Time)</SelectItem>
                    <SelectItem value="utc-5">UTC-05:00 (Eastern Time)</SelectItem>
                    <SelectItem value="utc+0">UTC+00:00 (GMT)</SelectItem>
                    <SelectItem value="utc+1">UTC+01:00 (Central European Time)</SelectItem>
                    <SelectItem value="utc+8">UTC+08:00 (China Standard Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="publicProfile" className="text-base">
                    Public Profile
                  </Label>
                  <p className="text-sm text-zinc-400">Make your profile visible to other users</p>
                </div>
                <Switch id="publicProfile" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize the appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Color Mode</Label>
                <RadioGroup defaultValue="dark" className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="cursor-pointer">
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="cursor-pointer">
                      Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="cursor-pointer">
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="grid grid-cols-5 gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 rounded-full bg-violet-500 cursor-pointer ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900"></div>
                    <span className="text-xs">Violet</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 rounded-full bg-emerald-500 cursor-pointer"></div>
                    <span className="text-xs">Emerald</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 rounded-full bg-rose-500 cursor-pointer"></div>
                    <span className="text-xs">Rose</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 rounded-full bg-amber-500 cursor-pointer"></div>
                    <span className="text-xs">Amber</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-10 w-10 rounded-full bg-blue-500 cursor-pointer"></div>
                    <span className="text-xs">Blue</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="animations" className="text-base">
                    Animations
                  </Label>
                  <p className="text-sm text-zinc-400">Enable animations and transitions</p>
                </div>
                <Switch id="animations" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reducedMotion" className="text-base">
                    Reduced Motion
                  </Label>
                  <p className="text-sm text-zinc-400">Minimize animations for accessibility</p>
                </div>
                <Switch id="reducedMotion" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>Customize your dashboard experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="compactView" className="text-base">
                    Compact View
                  </Label>
                  <p className="text-sm text-zinc-400">Use a more compact dashboard layout</p>
                </div>
                <Switch id="compactView" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sidebarCollapsed" className="text-base">
                    Collapsed Sidebar
                  </Label>
                  <p className="text-sm text-zinc-400">Start with sidebar collapsed by default</p>
                </div>
                <Switch id="sidebarCollapsed" />
              </div>

              <div className="space-y-2">
                <Label>Default Dashboard Tab</Label>
                <RadioGroup defaultValue="overview" className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overview" id="overview" />
                    <Label htmlFor="overview" className="cursor-pointer">
                      Overview
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="assessments" id="assessments" />
                    <Label htmlFor="assessments" className="cursor-pointer">
                      Assessments
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="courses" id="courses" />
                    <Label htmlFor="courses" className="cursor-pointer">
                      Courses
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-violet-400 mt-0.5" />
                    <div>
                      <Label htmlFor="emailNotifications" className="text-base">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-zinc-400">Receive notifications via email</p>
                    </div>
                  </div>
                  <Switch id="emailNotifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-emerald-400 mt-0.5" />
                    <div>
                      <Label htmlFor="pushNotifications" className="text-base">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-zinc-400">Receive notifications in your browser</p>
                    </div>
                  </div>
                  <Switch id="pushNotifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-rose-400 mt-0.5" />
                    <div>
                      <Label htmlFor="mobileNotifications" className="text-base">
                        Mobile Notifications
                      </Label>
                      <p className="text-sm text-zinc-400">Receive notifications on your mobile device</p>
                    </div>
                  </div>
                  <Switch id="mobileNotifications" defaultChecked />
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Types</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="assessmentReminders" className="text-base">
                      Assessment Reminders
                    </Label>
                    <p className="text-sm text-zinc-400">Get reminders about upcoming assessments</p>
                  </div>
                  <Switch id="assessmentReminders" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="courseUpdates" className="text-base">
                      Course Updates
                    </Label>
                    <p className="text-sm text-zinc-400">Notifications about new course content</p>
                  </div>
                  <Switch id="courseUpdates" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="achievementNotifications" className="text-base">
                      Achievements
                    </Label>
                    <p className="text-sm text-zinc-400">Notifications when you earn new achievements</p>
                  </div>
                  <Switch id="achievementNotifications" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="marketingCommunications" className="text-base">
                      Marketing Communications
                    </Label>
                    <p className="text-sm text-zinc-400">Receive promotional emails and offers</p>
                  </div>
                  <Switch id="marketingCommunications" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="mt-6 space-y-6">
          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-violet-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-emerald-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-emerald-400 mt-0.5" />
                  <div>
                    <Label htmlFor="twoFactorAuth" className="text-base">
                      Two-Factor Authentication
                    </Label>
                    <p className="text-sm text-zinc-400">Require a security code in addition to your password</p>
                  </div>
                </div>
                <Switch id="twoFactorAuth" />
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-sm text-zinc-400">
                  Two-factor authentication adds an additional layer of security to your account by requiring more than
                  just a password to sign in.
                </p>
                <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Shield className="h-4 w-4 mr-2" />
                  Set Up Two-Factor Authentication
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/60 hover:border-rose-700/50 transition-all duration-300 hover:shadow-lg hover:shadow-rose-900/10 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-900/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Manage your active sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-emerald-900/20 text-emerald-400">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Current Session</p>
                      <p className="text-xs text-zinc-400">Chrome on Windows • New York, USA</p>
                      <p className="text-xs text-zinc-500">Started 2 hours ago</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-900/30 text-emerald-400">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-zinc-700 text-zinc-400">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Mobile App</p>
                      <p className="text-xs text-zinc-400">iPhone • San Francisco, USA</p>
                      <p className="text-xs text-zinc-500">Last active 3 days ago</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-rose-400"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-rose-400"
              >
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
