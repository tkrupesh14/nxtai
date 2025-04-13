'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    console.error("Missing required fields.")
    redirect('/auth/signup') // or show error toast
    return
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (signUpError) {
    console.error("Signup Error:", signUpError.message)
    redirect('/error') // or show error toast
    return
  }

  const userId = signUpData.user?.id

  if (!userId) {
    console.error("No user ID returned after signup.")
    redirect('/error')
    return
  }

  // Insert into the custom `users` table
  const { error: insertError } = await supabase.from('users').insert({
    id: userId,
    full_name: name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  if (insertError) {
    console.error("Insert into users table failed:", insertError.message)
    redirect('/error')
    return
  }

  revalidatePath('/auth/confirm-user', 'layout')
  redirect('/auth/confirm-user')
}
