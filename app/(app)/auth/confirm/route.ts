import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'

import { confirmNext } from '@/lib/auth/confirm-next'
import { publicOrigin } from '@/lib/request-origin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Email links (supabase/templates): verifies the token hash, so the link works in any browser or device.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = confirmNext(searchParams.get('next'), type, publicOrigin(request))

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      redirect(next)
    }
  }

  // redirect the user to an error page with some instructions
  redirect(type === 'recovery' ? '/login?error=reset_link' : '/login?error=signup_link')
}