import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { authCookieDomain, requestHost } from '@/lib/code-host'
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
    domain?: string
  }
}

/** Set once sign-in cookies have been moved to the shared domain (see shareAuthCookies). */
export const SHARED_AUTH_MARK = 'krpex-shared-auth'
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60

// Paths that need a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ['/dashboard', '/learn', '/onboarding', '/account', '/admin', '/teach']

/**
 * Sign-in cookies used to belong to krpex.in only; now they are shared with code.krpex.in (Domain=.krpex.in).
 * On the first request after the change (no marker cookie), copy each Supabase cookie to the shared domain and
 * delete the old host-only copy, so the browser never holds two cookies with the same name. Also clean up if a
 * host-only copy ever reappears (the same name twice in the Cookie header). Must run last: it appends raw
 * Set-Cookie headers, which a later `response.cookies.set` would drop.
 */
export function shareAuthCookies(request: NextRequest, response: NextResponse) {
  const domain = authCookieDomain(requestHost(request.headers))
  if (!domain) return response
  const sb = request.cookies.getAll().filter((c) => c.name.startsWith('sb-'))
  const raw = (request.headers.get('cookie') ?? '').split(';').map((p) => p.split('=')[0].trim())
  const duplicated = new Set(raw.filter((n, i) => n.startsWith('sb-') && raw.indexOf(n) !== i))
  const marked = request.cookies.has(SHARED_AUTH_MARK)
  if (marked && duplicated.size === 0) return response
  if (!marked && sb.length === 0) return response

  if (!marked) {
    const alreadySet = new Set(response.cookies.getAll().map((c) => c.name))
    for (const c of sb) {
      if (alreadySet.has(c.name)) continue
      response.cookies.set(c.name, c.value, { domain, path: '/', sameSite: 'lax', httpOnly: false, secure: true, maxAge: COOKIE_MAX_AGE })
    }
    response.cookies.set(SHARED_AUTH_MARK, '1', { domain, path: '/', sameSite: 'lax', secure: true, maxAge: COOKIE_MAX_AGE })
  }
  const old = marked ? sb.filter((c) => duplicated.has(c.name)) : sb
  for (const c of old) response.headers.append('set-cookie', `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`)
  return response
}

/**
 * Refresh the Supabase session and guard signed-in pages. `next` builds the pass-through response
 * (NextResponse.next, or a rewrite for code.krpex.in).
 */
export async function updateSession(
  request: NextRequest,
  next: (request: NextRequest) => NextResponse = (r) => NextResponse.next({ request: r }),
) {
  let supabaseResponse = next(request)
  const domain = authCookieDomain(requestHost(request.headers))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(domain ? { cookieOptions: { domain } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = next(request)
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
    return shareAuthCookies(request, redirect)
  }

  if (!user && isProtected) {
    const url = new URL(`/login?next=${encodeURIComponent(pathname + search)}`, publicOrigin(request))
    const redirect = NextResponse.redirect(url)
    // Keep any cookies Supabase just cleared/refreshed.
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return shareAuthCookies(request, redirect)
  }

  return shareAuthCookies(request, supabaseResponse)
}
