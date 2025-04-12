import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WelcomeBannerClient from './welcome-banner-client'

export default async function WelcomeBanner() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/auth/login')
  }
  console.log(data);
  

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
      name={data.user.name}
      timeString={timeString}
      greeting={greeting}
    />
  )
}
