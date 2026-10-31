"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, User, Settings, Bell, Shield, Award, Edit } from "lucide-react"
import AchievementCard from "@/components/dashboard/achievement-card"

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)
  }

  // Sample achievements data
  const achievements = [
    {
      id: 1,
      title: "Prompt Master",
      description: "Completed 10 advanced prompt engineering assessments",
      date: "Earned 2 weeks ago",
      icon: <Award className="h-5 w-5" />,
      color: "violet",
    },
    {
      id: 2,
      title: "Consistent Learner",
      description: "Maintained a 7-day learning streak",
      date: "Earned 3 days ago",
      icon: <Award className="h-5 w-5" />,
      color: "emerald",
    },
    {
      id: 3,
      title: "Course Champion",
      description: "Completed 5 courses with distinction",
      date: "Earned 1 month ago",
      icon: <Award className="h-5 w-5" />,
      color: "amber",
    },
    {
      id: 4,
      title: "AI Collaborator",
      description: "Successfully completed 20 AI collaboration exercises",
      date: "Earned 2 months ago",
      icon: <Award className="h-5 w-5" />,
      color: "rose",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-zinc-400">Manage your account settings and preferences</p>
      </div>

      {/* Profile Overview */}
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="bg-zinc-900 border-zinc-800 w-full md:w-1/3">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <Avatar className="h-24 w-24 border-2 border-violet-500">
                  <AvatarImage src="/placeholder.svg?height=96&width=96" alt="User" />
                  <AvatarFallback className="bg-violet-900 text-violet-100 text-xl">AJ</AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 bg-violet-600 rounded-full p-1.5 border-2 border-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <h2 className="text-xl font-bold">Alex Johnson</h2>
              <p className="text-zinc-400 text-sm">alex.johnson@example.com</p>
              <div className="flex flex-wrap gap-2 justify-center mt-3">
                <Badge variant="outline" className="bg-violet-900/20 border-violet-700 text-violet-400">
                  Prompt Engineer
                </Badge>
                <Badge variant="outline" className="bg-emerald-900/20 border-emerald-700 text-emerald-400">
                  Level 4
                </Badge>
              </div>
              <div className="w-full mt-6 pt-6 border-t border-zinc-800">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Member since</span>
                  <span className="text-white">January 2023</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Assessments</span>
                  <span className="text-white">15 completed</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Courses</span>
                  <span className="text-white">5 completed</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Achievements</span>
                  <span className="text-white">8 earned</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 p-1">
              <TabsTrigger value="personal" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                <User className="h-4 w-4 mr-2" />
                Personal Info
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself"
                      defaultValue="Prompt engineering enthusiast with a background in AI and machine learning. Looking to improve my skills and connect with others in the field."
                      className="bg-zinc-800 border-zinc-700 focus:border-violet-500 min-h-[100px]"
                    />
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Dark Mode</h4>
                        <p className="text-xs text-zinc-400">Always use dark mode</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Show Progress</h4>
                        <p className="text-xs text-zinc-400">Show progress indicators on dashboard</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Public Profile</h4>
                        <p className="text-xs text-zinc-400">Make your profile visible to other users</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Control how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Email Notifications</h4>
                        <p className="text-xs text-zinc-400">Receive notifications via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Assessment Reminders</h4>
                        <p className="text-xs text-zinc-400">Get reminders about upcoming assessments</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Course Updates</h4>
                        <p className="text-xs text-zinc-400">Notifications about new course content</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Marketing Communications</h4>
                        <p className="text-xs text-zinc-400">Receive promotional emails and offers</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="••••••••"
                        className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="••••••••"
                        className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="bg-zinc-800 border-zinc-700 focus:border-violet-500"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Two-Factor Authentication</h4>
                        <p className="text-xs text-zinc-400">Add an extra layer of security</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-violet-600 hover:bg-violet-700 text-white"
                  >
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-amber-400" />
              Achievements
            </CardTitle>
            <CardDescription>Your earned badges and accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

