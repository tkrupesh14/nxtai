import Link from "next/link"

import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { displayNameFor, getSignedInUser, initialsFor } from "@/lib/supabase/profile"
import { BetaBadge } from "@/components/site/beta-badge"

/** Header for code.krpex.in. Account pages live on the main site, so those links go there. */
export async function CodeHeader() {
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const name = user ? displayNameFor(user) : ""
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={links.code("/")} className="flex items-center gap-2">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              {"</>"}
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Krpex <span className="text-primary">Code</span>
            </span>
            <BetaBadge />
          </Link>
          <nav className="hidden items-center gap-5 text-sm sm:flex">
            <Link href={links.code("/problems")} className="text-muted-foreground transition-colors hover:text-foreground">
              Problems
            </Link>
            <Link href={links.code("/plans")} className="text-muted-foreground transition-colors hover:text-foreground">
              Study plans
            </Link>
            <Link href={links.code("/playground")} className="text-muted-foreground transition-colors hover:text-foreground">
              Playground
            </Link>
            <a href={links.main("/learn")} className="text-muted-foreground transition-colors hover:text-foreground">
              My courses
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <a
              href={links.main("/account")}
              title={`${name} · your account`}
              className="flex size-9 items-center justify-center rounded-full border bg-muted text-xs font-semibold"
            >
              {initialsFor(name)}
            </a>
          ) : (
            <Button asChild size="sm">
              <a href={links.main(`/login?next=${encodeURIComponent("/code")}`)}>Log in</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
