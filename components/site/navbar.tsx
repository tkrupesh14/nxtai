import Link from "next/link"

import { UserMenu } from "@/components/learn/user-menu"
import { MobileMenu } from "@/components/site/mobile-menu"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { displayNameFor, initialsFor } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

const links = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
]

export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const name = user ? displayNameFor(user) : ""
  const avatar = user?.user_metadata?.avatar_url
  return (
    <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">Krpex</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/learn">My courses</Link>
              </Button>
              <UserMenu
                name={name}
                email={user.email}
                avatarUrl={typeof avatar === "string" ? avatar : undefined}
                initials={initialsFor(name)}
              />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/create-account">Create account</Link>
              </Button>
            </>
          )}
          <MobileMenu links={links} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  )
}
