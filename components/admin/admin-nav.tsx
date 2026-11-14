"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export const ADMIN_SECTIONS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/code", label: "Code" },
  { href: "/admin/reports", label: "Lesson reports" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/professors", label: "Professors" },
  { href: "/admin/system", label: "System" },
] as const

/** Sidebar on wide screens, a row of scrolling tabs on phones. */
export function AdminNav() {
  const path = usePathname()
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`))
  return (
    <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex gap-1 md:sticky md:top-24 md:flex-col">
        {ADMIN_SECTIONS.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              aria-current={active(s.href) ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active(s.href) && "bg-muted font-medium text-foreground",
              )}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
