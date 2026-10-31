import { getCurrentProfile, initialsFor } from '@/lib/supabase/profile'
import DashboardSidebar from './dashboard-sidebar'

export default async function DashboardSidebarServer() {
  const { profile } = await getCurrentProfile()
  return <DashboardSidebar user={profile} avatarFallback={initialsFor(profile.full_name)} />
}
