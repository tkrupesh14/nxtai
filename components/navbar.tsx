'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useIsHydrated } from '@/hooks/useIsHydrated'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const router = useRouter()
  const hydrated = useIsHydrated()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Check initial auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!hydrated) return null // avoid rendering until hydration completes

  return (
    <header className="bg-black border-b border-zinc-800 text-white px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-2xl font-bold text-emerald-400">NxtAI</Link>
      <nav className="space-x-6 flex items-center">
        <Link href="/assessments" className="hover:text-emerald-400">Assessments</Link>
        <Link href="/learn" className="hover:text-emerald-400">Learn</Link>
        <Link href="/features" className="hover:text-emerald-400">Features</Link>

        {!isLoggedIn ? (
          <>
            <Button variant="outline" onClick={() => router.push('/auth/login')}>Login</Button>
            <Button onClick={() => router.push('/auth/signup')}>Sign Up</Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            <Button
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                setIsLoggedIn(false)
                router.push('/')
              }}
            >
              Logout
            </Button>
          </>
        )}
      </nav>
    </header>
  )
}
