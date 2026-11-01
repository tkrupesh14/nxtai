import Link from "next/link"

import { LearningForm, NameForm } from "@/components/learn/account-forms"
import { AccountSection } from "@/components/learn/account-section"
import { Button } from "@/components/site/ui/button"
import { getAccountOverview } from "@/lib/learning/data"
import { ASK_LIMITS } from "@/lib/learning/professor"
import { getCurrentProfile, initialsFor } from "@/lib/supabase/profile"
import { cn } from "@/lib/utils"

function Meter({ label, used, limit, hint }: { label: string; used: number; limit: number; hint?: string }) {
  const left = Math.max(limit - used, 0)
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {left}
        <span className="text-sm font-normal text-muted-foreground"> of {limit} left</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className={cn("h-full rounded-full", left === 0 ? "bg-destructive" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export default async function AccountPage() {
  const [{ user, profile }, { learning, usage }] = await Promise.all([getCurrentProfile(), getAccountOverview()])
  const joined = new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })

  return (
    <>
      <section className="flex items-center gap-4 rounded-xl border bg-card p-5 md:p-6">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted font-semibold">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            initialsFor(profile.full_name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{profile.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">Member since {joined}</p>
        </div>
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">Free plan</span>
      </section>

      <AccountSection title="Today's usage" description="Daily allowances reset at midnight (India time).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label="Questions to your professors"
            used={usage.questionsToday}
            limit={ASK_LIMITS.perDay}
            hint={`Up to ${ASK_LIMITS.perLessonPerDay} per lesson each day.`}
          />
          <Meter
            label="Quick answers"
            used={usage.quickToday}
            limit={ASK_LIMITS.quickPerDay}
            hint="Opening one you've already seen is free."
          />
          <Stat label="Courses created this month" value={usage.coursesThisMonth} />
          <Stat label="Lessons completed" value={usage.lessonsCompleted} />
        </div>
      </AccountSection>

      <AccountSection
        title="Plan & credits"
        description="You're on the Free plan. Credit recharges and the Pro plan are coming soon."
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm">
            Credits: <span className="font-semibold tabular-nums">0</span>
          </p>
          <Button variant="outline" disabled>
            Recharge credits
          </Button>
          <Button disabled>Upgrade to Pro</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          See what&apos;s planned on the{" "}
          <Link href="/pricing" className="underline hover:text-foreground">
            pricing page
          </Link>
          .
        </p>
      </AccountSection>

      <AccountSection title="Profile">
        <NameForm name={profile.full_name} />
      </AccountSection>

      <AccountSection
        title="Learning preferences"
        description="Used when we create new courses and lessons for you. Lessons already written stay as they are."
      >
        {learning ? (
          <LearningForm values={learning} />
        ) : (
          <p className="text-sm text-muted-foreground">
            These are set when you create your first course.{" "}
            <Link href="/onboarding" className="font-medium text-primary hover:underline">
              Create a course
            </Link>
          </p>
        )}
      </AccountSection>
    </>
  )
}
