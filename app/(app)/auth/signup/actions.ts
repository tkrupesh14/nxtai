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
    // Stored on auth.users so the profile trigger (supabase/migrations) can use it.
    options: { data: { full_name: name } },
  })

  if (signUpError) {
    console.error("Signup Error:", signUpError.message)
    redirect('/error?reason=signup')
    return
  }

  const userId = signUpData.user?.id

  if (!userId) {
    console.error("No user ID returned after signup.")
    redirect('/error?reason=signup')
    return
  }

  // The public.users profile row is created by the on_auth_user_created trigger
  // (supabase/migrations), using the full_name passed in options.data above.

  revalidatePath('/auth/confirm-user', 'layout')
  redirect('/auth/confirm-user')
}
