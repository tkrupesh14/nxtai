// app/(dashboard)/dashboard/welcome-banner.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from './dashboard-sidebar'

export default async function DashboardSidebarServer() {
  const supabase = await createClient()

  // Get the logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Fetch full_name from `users` table
  const {
    data: userProfile,
    error: profileError,
  } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !userProfile) {
    console.error('Failed to fetch user profile:', profileError)
    redirect('/auth/login') // or redirect to error page / show fallback name
  }
  function getInitials(name: string): string {
    if (!name) return "U" // fallback
    const words = name.trim().split(" ")
    if (words.length === 1) return words[0][0]?.toUpperCase()
    return `${words[0][0]}${words[1][0]}`.toUpperCase()
  }

  return (
    <DashboardSidebar
      user={userProfile}
      avatarFallback = {getInitials(userProfile.full_name)}
    />
  )
}
