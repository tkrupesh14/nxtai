import Link from "next/link"

import { UserMenu } from "@/components/learn/user-menu"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { getCurrentProfile, initialsFor } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"
import { getMyProfessor } from "@/lib/teach/data"

export async function LearnHeader() {
  const { user, profile } = await getCurrentProfile()
  const supabase = await createClient()
  const [{ data: isAdmin }, professor] = await Promise.all([supabase.rpc("is_admin"), getMyProfessor()])
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
            {professor ? (
              <Link href="/teach" className="text-muted-foreground transition-colors hover:text-foreground">
                Teaching
              </Link>
            ) : null}
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
            isProfessor={professor !== null}
          />
        </div>
      </div>
    </header>
  )
}
