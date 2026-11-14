import Link from "next/link"

import { AdminHeading, AdminSection, auditText, Pill, when } from "@/components/admin/ui"
import { CommunityBanForm, ModerateButtons, ProfileVisibilityForm } from "@/components/learn/admin-community"
import { Button } from "@/components/site/ui/button"
import { COMMUNITY_LOG_PER_PAGE, getAdminBoards, getCommunityBans, getCommunityLog, getCommunityQueue, requireAdmin, type QueueShow } from "@/lib/admin/data"

import { liftBanAction, setBoardActiveAction } from "../actions"

export const metadata = { title: "Community — Admin — Krpex" }

type Params = { show?: string; log?: string }

const SHOW: { id: QueueShow; label: string }[] = [
  { id: "all", label: "Needs review" },
  { id: "reported", label: "Reported" },
  { id: "hidden", label: "Hidden" },
]

export default async function AdminCommunity({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin()
  const p = await searchParams
  const show: QueueShow = p.show === "reported" || p.show === "hidden" ? p.show : "all"
  const logPage = Math.max(1, Math.min(2000, Number.parseInt(p.log ?? "1", 10) || 1))
  const [queue, bans, log, boards] = await Promise.all([getCommunityQueue(show), getCommunityBans(), getCommunityLog(logPage), getAdminBoards()])
  const href = (s: QueueShow, page = logPage) => {
    const qs = new URLSearchParams()
    if (s !== "all") qs.set("show", s)
    if (page > 1) qs.set("log", String(page))
    const q = qs.toString()
    return `/admin/community${q ? `?${q}` : ""}`
  }
  const logRows = log.data.slice(0, COMMUNITY_LOG_PER_PAGE)
  const logMore = log.data.length > COMMUNITY_LOG_PER_PAGE
  const offBoards = boards.data.filter((b) => !b.active).length

  return (
    <>
      <AdminHeading
        title="Community"
        note={`${bans.data.length} ${bans.data.length === 1 ? "learner" : "learners"} can't post · ${offBoards} ${offBoards === 1 ? "board" : "boards"} off`}
        errors={[queue.error, bans.error, log.error, boards.error]}
      />

      <AdminSection
        title={`${SHOW.find((s) => s.id === show)!.label} (${queue.data.length})`}
        description="Three reports from learners at level 2+ hide an item until you keep or remove it. Removing tells the author why."
      >
        <nav aria-label="Queue filter" className="mb-4 flex flex-wrap gap-2 text-sm">
          {SHOW.map((s) => (
            <Link
              key={s.id}
              href={href(s.id, 1)}
              aria-current={s.id === show ? "page" : undefined}
              className={`rounded-full border px-3 py-1 ${s.id === show ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        {queue.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <ul className="grid gap-3" aria-label="Moderation queue">
            {queue.data.map((c) => (
              <li key={`${c.target}-${c.id}`} className="grid min-w-0 gap-2 rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                    <Pill>{c.target === "post" ? "Post" : "Comment"}</Pill>
                    {c.status === "hidden" ? <Pill tone="warn">Hidden</Pill> : null}
                    {c.reports.length ? <Pill tone="danger">{`${c.reports.length} ${c.reports.length === 1 ? "report" : "reports"}`}</Pill> : null}
                    <a href={c.path} className="min-w-0 break-words hover:underline">
                      {c.title}
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {"deleted" in c.author ? "[deleted user]" : `@${c.author.handle} · L${c.author.level}`}
                    {c.author_email && c.author_id ? (
                      <>
                        {" · "}
                        <Link href={`/admin/users/${c.author_id}`} className="hover:underline">
                          {c.author_email}
                        </Link>
                      </>
                    ) : null}
                    {" · "}
                    {when(c.created_at)}
                  </p>
                </div>
                {c.body && <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-[13px]">{c.body}</p>}
                {c.code && <pre className="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{c.code}</pre>}
                {c.reports.length ? (
                  <ul className="grid gap-0.5 text-xs text-muted-foreground">
                    {c.reports.map((r, i) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">{r.reason}</span>
                        {r.note ? ` — ${r.note}` : ""} · {when(r.at)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ModerateButtons target={c.target} id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title={`Can't post (${bans.data.length})`} description="Bans in force. A ban stops new posts and comments; their old posts stay up.">
        {bans.data.length === 0 ? (
          <p className="mb-4 text-sm text-muted-foreground">No one is banned.</p>
        ) : (
          <ul className="mb-4 divide-y rounded-lg border" aria-label="Bans">
            {bans.data.map((b) => (
              <li key={b.user_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    <Link href={`/admin/users/${b.user_id}`} className="hover:underline">
                      {b.handle ? `@${b.handle}` : (b.email ?? "[deleted user]")}
                    </Link>{" "}
                    <span className="font-normal text-muted-foreground">· {b.until ? `until ${when(b.until)}` : "for good"}</span>
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {b.reason || "No reason given"} · {b.by ?? "an admin"}, {when(b.at)}
                  </p>
                </div>
                {b.handle ? (
                  <form action={liftBanAction.bind(null, b.handle)}>
                    <Button type="submit" size="sm" variant="outline">
                      Lift
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-2 text-sm font-medium">Stop someone posting</h3>
        <CommunityBanForm />
      </AdminSection>

      <AdminSection title="Public profile page">
        <ProfileVisibilityForm />
      </AdminSection>

      <AdminSection title="Boards" description="A board that's off takes no new discussions and leaves the lists. Its threads stay readable by link.">
        <ul className="divide-y rounded-lg border" aria-label="Boards">
          {boards.data.map((b) => (
            <li key={b.slug} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  <a href={`/community/c/${b.slug}`} className="hover:underline">
                    {b.title}
                  </a>
                  {b.kind === "course" ? <Pill>Course</Pill> : null}
                  {!b.active ? <Pill tone="warn">Off</Pill> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.posts} {b.posts === 1 ? "post" : "posts"}
                  {b.hidden ? ` · ${b.hidden} hidden or removed` : ""}
                  {b.last_activity ? ` · active ${when(b.last_activity)}` : ""}
                </p>
              </div>
              <form action={setBoardActiveAction.bind(null, b.slug, !b.active)}>
                <Button type="submit" size="sm" variant={b.active ? "outline" : "default"} aria-label={`${b.active ? "Turn off" : "Turn on"} ${b.title}`}>
                  {b.active ? "Turn off" : "Turn on"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </AdminSection>

      <AdminSection title="Moderation history" description="Every keep, remove, ban and board change, newest first.">
        {logRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border" aria-label="Moderation history">
            {logRows.map((e, i) => {
              const path = typeof e.detail.path === "string" ? e.detail.path : null
              const title = typeof e.detail.title === "string" && !String(e.action).startsWith("board_") ? e.detail.title : null
              const reason = typeof e.detail.reason === "string" ? e.detail.reason : null
              return (
                <li key={i} className="grid gap-0.5 px-4 py-2.5 text-sm">
                  <p className="break-words">
                    {auditText(e)}
                    {title ? (
                      <>
                        {": "}
                        {path ? (
                          <a href={path} className="hover:underline">
                            “{title}”
                          </a>
                        ) : (
                          `“${title}”`
                        )}
                      </>
                    ) : null}
                    {e.user_id && e.email ? (
                      <>
                        {" · "}
                        <Link href={`/admin/users/${e.user_id}`} className="text-muted-foreground hover:underline">
                          {e.email}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {reason ? `“${reason}” · ` : ""}
                    {e.admin ?? "an admin"}, {when(e.at)}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
        {logPage > 1 || logMore ? (
          <nav aria-label="History pages" className="mt-3 flex items-center justify-between text-sm">
            {logPage > 1 ? (
              <Link href={href(show, logPage - 1)} className="text-primary hover:underline">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            {logMore ? (
              <Link href={href(show, logPage + 1)} className="text-primary hover:underline">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </AdminSection>
    </>
  )
}
