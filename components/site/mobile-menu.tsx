"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/site/ui/button"

type NavLink = { href: string; label: string }

// Phone-only navigation (the desktop links are hidden below `md`).
export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </Button>
      {open && (
        <nav
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b bg-background shadow-lg md:hidden"
        >
          <ul className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === l.href ? "page" : undefined}
                  className="block py-3 text-base text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block py-3 text-base font-medium text-foreground"
              >
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </>
  )
}
