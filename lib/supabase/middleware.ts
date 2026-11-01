import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { publicOrigin } from '@/lib/request-origin'

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

// Paths that need a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ['/dashboard', '/learn', '/onboarding', '/account', '/admin']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session cookie if it has expired. Do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Signed-in visitors don't need the log-in / sign-up pages.
  if (user && (pathname === '/login' || pathname === '/create-account') && !request.nextUrl.searchParams.has('error')) {
    const next = request.nextUrl.searchParams.get('next')
    const dest = next && /^\/(?![\/\\])/.test(next) ? next : '/learn'
    const redirect = NextResponse.redirect(new URL(dest, publicOrigin(request)))
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  if (!user && isProtected) {
    const url = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, publicOrigin(request))
    const redirect = NextResponse.redirect(url)
    // Keep any cookies Supabase just cleared/refreshed.
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  return supabaseResponse
}
