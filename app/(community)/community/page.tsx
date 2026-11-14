import Link from "next/link"

import { FeedList } from "@/components/community/feed-list"
import { Button } from "@/components/site/ui/button"
import { codeLinks } from "@/lib/code/host"
import { BOARDS, isBoardOpen } from "@/lib/community/boards"
import { getBoardStats, getFeed, getMyPublicProfile } from "@/lib/community/data"
import { getSignedInUser } from "@/lib/supabase/profile"

// community.krpex.in home: the latest active discussions across problems and boards, and every board (plan.md Phase 5).

const PER_PAGE = 20

export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.min(20, Number.parseInt((await searchParams).page ?? "1", 10) || 1))
  const [user, links] = await Promise.all([getSignedInUser(), codeLinks()])
  const [me, feed, stats] = await Promise.all([user ? getMyPublicProfile() : null, getFeed(null, PER_PAGE + 1, (page - 1) * PER_PAGE), getBoardStats()])
  const posts = feed.slice(0, PER_PAGE)
  const more = feed.length > PER_PAGE
  const home = links.community("/")

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      {page === 1 && (
        <section className="pb-8 pt-10 md:pt-14">
          <p className="text-sm font-medium text-primary">Krpex Community</p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-5xl">Learn together</h1>
          <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
            Share how you solved a problem, ask when you&apos;re stuck and show how far you&apos;ve come — with the same account you use for courses and coding.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!user ? (
              <Button asChild>
                <a href={links.main(`/login?next=${encodeURIComponent("/account#public-profile")}`)}>Join and claim your handle</a>
              </Button>
            ) : !me ? (
              <Button asChild>
                <a href={links.main("/account#public-profile")}>Claim your handle</a>
              </Button>
            ) : me.is_public && !me.hidden ? (
              <Button asChild variant="outline">
                <Link href={links.community(`/u/${me.handle}`)}>Your profile</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href={links.main("/account#public-profile")}>Make your profile public</a>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href={links.community("/guidelines")}>Community guidelines</Link>
            </Button>
          </div>
        </section>
      )}

      <div className={`grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] ${page === 1 ? "" : "pt-8"}`}>
        <section aria-labelledby="latest" className="grid content-start gap-4">
          <h2 id="latest" className="text-lg font-semibold">
            Latest discussions{page > 1 ? ` · page ${page}` : ""}
          </h2>
          {posts.length ? (
            <FeedList posts={posts} community={links.community} />
          ) : (
            <p className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
              It&apos;s quiet here so far. Pick a board and start the first discussion.
            </p>
          )}
          {(page > 1 || more) && (
            <nav aria-label="Pages" className="flex justify-between text-sm">
              {page > 1 ? (
                <Link href={page === 2 ? home : `${home}?page=${page - 1}`} className="text-primary hover:underline">
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              {more && (
                <Link href={`${home}?page=${page + 1}`} className="text-primary hover:underline">
                  Older →
                </Link>
              )}
            </nav>
          )}
        </section>

        <aside aria-labelledby="boards" className="grid content-start gap-3">
          <h2 id="boards" className="flex items-baseline justify-between text-lg font-semibold">
            Boards
            <Link href={links.community("/c")} className="text-sm font-normal text-primary hover:underline">
              All boards
            </Link>
          </h2>
          {(["general", "course"] as const).map((kind) => (
            <ul key={kind} className="divide-y rounded-xl border bg-card text-sm">
              {BOARDS.filter((b) => b.kind === kind && isBoardOpen(b.slug, stats)).map((b) => (
                <li key={b.slug}>
                  <Link href={links.community(`/c/${b.slug}`)} className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50">
                    <span aria-hidden>{b.icon}</span>
                    <span className="truncate">{b.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
          <p className="text-xs text-muted-foreground">
            Coding problems have their own Solutions and Discussion — open one on{" "}
            <a href={links.code("/problems")} className="text-primary hover:underline">
              Krpex Code
            </a>
            .
          </p>
        </aside>
      </div>
    </main>
  )
}
