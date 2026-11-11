"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Old links such as /admin#community (in notifications already sent) open the matching section. */
export function AdminHashRedirect({ map }: { map: Record<string, string> }) {
  const router = useRouter()
  useEffect(() => {
    const to = map[window.location.hash.slice(1)]
    if (to) router.replace(to)
  }, [map, router])
  return null
}
