import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Everything except static files and images.
    // Also not the recording upload: the proxy would cut its body off at 10 MB (the route checks sign-in itself).
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|api/teach/recordings$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
