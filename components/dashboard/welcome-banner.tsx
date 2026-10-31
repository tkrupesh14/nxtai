import { getCurrentProfile } from '@/lib/supabase/profile'
import WelcomeBannerClient from './welcome-banner-client'

export default async function WelcomeBanner() {
  const { profile: userProfile } = await getCurrentProfile()

  const now = new Date()
  const hours = now.getHours()
  const timeString = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  let greeting = 'Good evening'
  if (hours < 12) greeting = 'Good morning'
  else if (hours < 18) greeting = 'Good afternoon'

  return (
    <WelcomeBannerClient
      name={userProfile.full_name || 'user'}
      timeString={timeString}
      greeting={greeting}
    />
  )
}
