// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieItem = {
  name: string
  value: string
  options?: {
    httpOnly?: boolean
    secure?: boolean
    path?: string
    sameSite?: 'strict' | 'lax' | 'none'
    expires?: Date
    maxAge?: number
  }
}

export async function createClient() {
  const cookieStore =  await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log(`Setting cookie:`, { name, value, options }) // 👈 log here
              cookieStore.set(name, value, options)
        })
          } catch (err) {
            console.log("Could not set cookie:", err)
          }
        },
      },
    }
  )
}
