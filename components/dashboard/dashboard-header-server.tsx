import { getCurrentProfile, initialsFor } from '@/lib/supabase/profile'
import DashboardHeader from './dashboard-header'

export default async function DashboardHeaderServer() {
  const { profile } = await getCurrentProfile()
  return <DashboardHeader user={profile} avatarFallback={initialsFor(profile.full_name)} />
}
