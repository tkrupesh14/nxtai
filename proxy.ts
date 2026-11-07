import { NextResponse, type NextRequest } from 'next/server'

import { codeRoute, requestHost } from '@/lib/code-host'
import { shareAuthCookies, updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // code.krpex.in pages live under /code (lib/code-host.ts). Redirects happen here; the subdomain's rewrite
  // onto /code is in next.config.mjs (see the note there on why not here).
  const route = codeRoute(requestHost(request.headers), request.nextUrl.pathname, request.nextUrl.search)
  if (route?.kind === 'redirect') return shareAuthCookies(request, NextResponse.redirect(route.url, 308))
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Everything except static files and images (including the code runner, served as is on both hosts).
    // Also not the recording upload: the proxy would cut its body off at 10 MB (the route checks sign-in itself).
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|code-runner\\.html|api/teach/recordings$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
