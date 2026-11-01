import Link from "next/link"

import { UserMenu } from "@/components/learn/user-menu"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { getCurrentProfile, initialsFor } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"

export async function LearnHeader() {
  const { user, profile } = await getCurrentProfile()
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc("is_admin")
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/learn" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">Krpex</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link href="/learn" className="text-muted-foreground transition-colors hover:text-foreground">
              My courses
            </Link>
            <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/onboarding">New course</Link>
          </Button>
          <ThemeToggle />
          <UserMenu
            name={profile.full_name}
            email={user.email}
            avatarUrl={profile.avatar_url}
            initials={initialsFor(profile.full_name)}
            isAdmin={isAdmin === true}
          />
        </div>
      </div>
    </header>
  )
}
