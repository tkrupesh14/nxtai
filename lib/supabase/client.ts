import { createBrowserClient } from '@supabase/ssr'

import { authCookieDomain } from '@/lib/code-host'

export function createClient() {
  // One sign-in for krpex.in and code.krpex.in (see lib/code-host.ts).
  const domain = typeof window === 'undefined' ? undefined : authCookieDomain(window.location.hostname)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined
  )
}
