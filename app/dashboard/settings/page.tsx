"use server"

import { cookies } from "next/headers"
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsPageClient from './settings-page-client'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return <SettingsPageClient user={data.user} />
}
