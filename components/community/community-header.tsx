import Link from "next/link"

import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { getMyPublicProfile } from "@/lib/community/data"
import { codeLinks } from "@/lib/code/host"
import { displayNameFor, getSignedInUser, initialsFor } from "@/lib/supabase/profile"

/** Header for community.krpex.in. Account pages live on the main site, so those links go there. */
export async function CommunityHeader() {
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const me = user ? await getMyPublicProfile() : null
  const name = me?.display_name ?? (user ? displayNameFor(user) : "")
  const nav = "text-muted-foreground transition-colors hover:text-foreground"
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href={links.community("/")} className="flex shrink-0 items-center gap-2">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
              K
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Krpex <span className="text-primary">Community</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            <Link href={links.community("/guidelines")} className={nav}>
              Guidelines
            </Link>
            <a href={links.code("/problems")} className={nav}>
              Coding problems
            </a>
            <a href={links.main("/learn")} className={nav}>
              My courses
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <a
              href={me?.is_public && !me.hidden ? links.community(`/u/${me.handle}`) : links.main("/account#public-profile")}
              title={me?.is_public ? `${name} · your profile` : `${name} · set up your profile`}
              className="flex size-9 items-center justify-center rounded-full border bg-muted text-xs font-semibold"
            >
              {initialsFor(name)}
            </a>
          ) : (
            <Button asChild size="sm">
              <a href={links.main(`/login?next=${encodeURIComponent("/community")}`)}>Log in</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
