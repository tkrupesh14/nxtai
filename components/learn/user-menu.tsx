"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOut } from "@/app/(learn)/actions"

const itemClass = "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"

export function UserMenu({ name, email, avatarUrl, initials }: { name: string; email?: string; avatarUrl?: string; initials: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="sm:hidden">
            <Link role="menuitem" href="/learn" className={itemClass}>
              My courses
            </Link>
            <Link role="menuitem" href="/onboarding" className={itemClass}>
              New course
            </Link>
            <Link role="menuitem" href="/dashboard" className={itemClass}>
              Dashboard
            </Link>
            <div className="my-1 h-px bg-border" />
          </div>
          <Link role="menuitem" href="/account" className={itemClass}>
            Profile & usage
          </Link>
          <Link role="menuitem" href="/account/settings" className={itemClass}>
            Settings
          </Link>
          <div className="my-1 h-px bg-border" />
          <form action={signOut}>
            <button role="menuitem" type="submit" className={itemClass}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
