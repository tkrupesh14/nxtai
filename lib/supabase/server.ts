// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

import { authCookieDomain, requestHost } from '@/lib/code-host'

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
    domain?: string
  }
}

export async function createClient() {
  const cookieStore = await cookies()
  // One sign-in for krpex.in and code.krpex.in (see lib/code-host.ts).
  const domain = authCookieDomain(requestHost(await headers()))

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // The middleware refreshes the session, so this is safe to ignore.
          }
        },
      },
    }
  )
}
