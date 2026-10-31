import Link from "next/link"

import { signOut } from "@/app/(learn)/actions"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { getCurrentProfile, initialsFor } from "@/lib/supabase/profile"

export async function LearnHeader() {
  const { profile } = await getCurrentProfile()
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/learn" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">NxtAI</span>
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
          <div
            className="flex size-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-semibold"
            title={profile.full_name}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              initialsFor(profile.full_name)
            )}
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
