import { AdminHeading, AdminSection, when } from "@/components/admin/ui"
import { CommunityBanForm, ModerateButtons, ProfileVisibilityForm } from "@/components/learn/admin-community"
import { getCommunityQueue, requireAdmin } from "@/lib/admin/data"

export const metadata = { title: "Community — Admin — Krpex" }

export default async function AdminCommunity() {
  await requireAdmin()
  const queue = await getCommunityQueue()
  return (
    <>
      <AdminHeading title="Community" errors={[queue.error]} />

      <AdminSection
        title={`Reported or hidden (${queue.data.length})`}
        description="Three reports from learners at level 2+ hide an item until you keep or remove it. Removing tells the author why."
      >
        {queue.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <ul className="grid gap-3">
            {queue.data.map((c) => (
              <li key={`${c.target}-${c.id}`} className="grid gap-2 rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 font-medium">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.target === "post" ? "Post" : "Comment"}</span>{" "}
                    {c.status === "hidden" && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">Hidden</span>}{" "}
                    <a href={c.path} className="hover:underline">
                      {c.title}
                    </a>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {"deleted" in c.author ? "[deleted user]" : `@${c.author.handle} · L${c.author.level}`}
                    {c.author_email ? ` · ${c.author_email}` : ""}
                  </p>
                </div>
                {c.body && <p className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-[13px]">{c.body}</p>}
                {c.code && <pre className="max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs">{c.code}</pre>}
                <ul className="grid gap-0.5 text-xs text-muted-foreground">
                  {c.reports.map((r, i) => (
                    <li key={i}>
                      <span className="font-medium text-foreground">{r.reason}</span>
                      {r.note ? ` — ${r.note}` : ""} · {when(r.at)}
                    </li>
                  ))}
                </ul>
                <ModerateButtons target={c.target} id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection title="Stop someone posting">
        <CommunityBanForm />
      </AdminSection>

      <AdminSection title="Public profile page">
        <ProfileVisibilityForm />
      </AdminSection>
    </>
  )
}
