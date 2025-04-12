'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useIsHydrated } from '@/hooks/useIsHydrated'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const hydrated = useIsHydrated()
  const [isLoggedIn, setIsLoggedIn] = useState(false)



  if (!hydrated) return null // avoid rendering until hydration completes

  return (
    <header className="bg-black border-b border-zinc-800 text-white px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-2xl font-bold text-emerald-400">NxtAI</Link>
      <nav className="space-x-6">
        <Link href="/assessments" className="hover:text-emerald-400">Assessments</Link>
        <Link href="/learn" className="hover:text-emerald-400">Learn</Link>
        <Link href="/features" className="hover:text-emerald-400">Features</Link>
        {!isLoggedIn ? (
          <>
            <Button variant="outline" onClick={() => router.push('/auth/login')}>Login</Button>
            <Button onClick={() => router.push('/auth/signup')}>Sign Up</Button>
          </>
        ) : (
          <Button onClick={() => {
        
            setIsLoggedIn(false)
            router.push('/')
          }}>Logout</Button>
        )}
      </nav>
    </header>
  )
}
