import Link from "next/link"

import { LearningForm, NameForm } from "@/components/learn/account-forms"
import { AccountSection } from "@/components/learn/account-section"
import { Button } from "@/components/site/ui/button"
import { getAccountOverview, getAccountSummary } from "@/lib/learning/data"
import { CREDIT_COST, CREDIT_PACKS, PLANS, PRO_PRICE_INR } from "@/lib/learning/plans"
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
  const [{ user, profile }, { learning, usage }, account] = await Promise.all([
    getCurrentProfile(),
    getAccountOverview(),
    getAccountSummary(),
  ])
  const planName = PLANS[account.plan].name
  const renews = account.periodEnd
    ? new Date(account.periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null
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
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
            account.plan === "pro" && "border-primary bg-primary/10 text-primary",
          )}
        >
          {planName} plan
        </span>
      </section>

      <AccountSection title="Today's usage" description="Daily allowances reset at midnight (India time).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label="Free questions to your professors"
            used={usage.questionsToday}
            limit={account.askDay}
            hint={`Up to ${account.askLesson} per lesson each day. After that, each question uses ${CREDIT_COST.question} credit.`}
          />
          <Meter
            label="Quick answers"
            used={usage.quickToday}
            limit={account.quickDay}
            hint="Opening one you've already seen is free."
          />
          <Meter
            label="Free courses this month"
            used={account.coursesUsed}
            limit={account.coursesMonth}
            hint={`After that, each new course uses ${CREDIT_COST.course} credits. Up to 3 new courses a day.`}
          />
          <Stat label="Lessons completed" value={usage.lessonsCompleted} />
        </div>
      </AccountSection>

      <AccountSection
        title="Plan & credits"
        description={
          account.plan === "pro"
            ? `You're on Pro${renews ? `, renewing on ${renews}` : ""}.`
            : "Credits keep you going after the free allowance runs out. They never expire."
        }
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-sm">
            Credits: <span className="text-2xl font-semibold tabular-nums">{account.credits}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {CREDIT_COST.question} credit per extra question · {CREDIT_COST.course} credits per extra course
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-lg border p-4">
              <p className="font-semibold">{pack.credits} credits</p>
              <p className="text-sm text-muted-foreground">₹{pack.priceInr}</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                Coming soon
              </Button>
            </div>
          ))}
          {account.plan !== "pro" && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="font-semibold">Pro</p>
              <p className="text-sm text-muted-foreground">
                ₹{PRO_PRICE_INR}/month · {PLANS.pro.askDay} questions a day, {PLANS.pro.coursesMonth} courses a month
              </p>
              <Button size="sm" className="mt-3 w-full" disabled>
                Coming soon
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Payments are being set up. See the{" "}
          <Link href="/pricing" className="underline hover:text-foreground">
            pricing page
          </Link>{" "}
          for details.
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
