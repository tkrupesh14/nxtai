import Link from "next/link"

import { LearningForm, NameForm } from "@/components/learn/account-forms"
import { AccountSection } from "@/components/learn/account-section"
import { Button } from "@/components/site/ui/button"
import { listCertificates } from "@/lib/learning/assessments"
import { getAccountOverview, getAccountSummary } from "@/lib/learning/data"
import { BuyButton } from "@/components/learn/buy-button"
import { PublicProfileForm } from "@/components/learn/public-profile-form"
import { codeHref } from "@/lib/code-host"
import { getMyPublicProfile } from "@/lib/community/data"
import {
  CREDIT_COST,
  CREDIT_PACKS,
  PLANS,
  PRO_DAYS,
  PRO_PRICE_INR,
  PRODUCTS,
  type ProductId,
} from "@/lib/learning/plans"
import { razorpayConfigured } from "@/lib/payments/razorpay"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, initialsFor } from "@/lib/supabase/profile"
import { cn } from "@/lib/utils"

function Meter({
  label,
  used,
  limit,
  hint,
  extra,
}: {
  label: string
  used: number
  limit: number
  hint?: string
  /** Shown after the free count, e.g. "then 100 more with credits". */
  extra?: string
}) {
  const left = Math.max(limit - used, 0)
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {left}
        <span className="text-sm font-normal text-muted-foreground"> of {limit} free left</span>
      </p>
      {extra ? <p className="text-sm text-primary">{extra}</p> : null}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div
          className={cn("h-full rounded-full", left === 0 && !extra ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function ComingSoon() {
  return (
    <Button variant="outline" size="sm" className="w-full" disabled>
      Coming soon
    </Button>
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
  const [{ user, profile }, { learning, usage }, account, certificates, publicProfile] = await Promise.all([
    getCurrentProfile(),
    getAccountOverview(),
    getAccountSummary(),
    listCertificates(),
    getMyPublicProfile(),
  ])
  const planName = PLANS[account.plan].name
  const payments = razorpayConfigured()
  const supabase = await createClient()
  const { data: paidOrders } = await supabase
    .from("payment_orders")
    .select("razorpay_order_id, razorpay_payment_id, product, amount_paise, created_at, paid_at")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(10)
  const orders = paidOrders ?? []
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

      <AccountSection
        id="public-profile"
        title="Public profile"
        description="Claim a handle to take part in the Krpex community, and choose whether others can see your progress."
      >
        <PublicProfileForm profile={publicProfile} defaultName={profile.full_name} profileHref={codeHref("/u/", null)} />
      </AccountSection>

      <AccountSection title="Today's usage" description="Daily allowances reset at midnight (India time).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Meter
            label="Questions to your professors"
            used={usage.questionsToday}
            limit={account.askDay}
            extra={account.credits > 0 ? `then ${account.credits} more with your credits` : undefined}
            hint={`Up to ${account.askLesson} free per lesson each day. After that, each question uses ${CREDIT_COST.question} credit.`}
          />
          <Meter
            label="Quick answers"
            used={usage.quickToday}
            limit={account.quickDay}
            hint="Opening one you've already seen is free."
          />
          <Meter
            label="New courses this month"
            used={account.coursesUsed}
            limit={account.coursesMonth}
            extra={
              account.credits >= CREDIT_COST.course
                ? `then ${Math.floor(account.credits / CREDIT_COST.course)} more with your credits`
                : undefined
            }
            hint={`After that, each new course uses ${CREDIT_COST.course} credits. Up to 3 new courses a day.`}
          />
          <Stat label="Lessons completed" value={usage.lessonsCompleted} />
        </div>
      </AccountSection>

      <AccountSection
        title="Certificates"
        description={
          account.plan === "pro"
            ? "Pass a course's module tests and final exam to get a certificate you can share."
            : "Certificates are part of Pro. Your exam results are kept, so you can claim one after upgrading."
        }
      >
        {certificates.length ? (
          <ul className="divide-y rounded-lg border">
            {certificates.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.course_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {c.score}%
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/certificate/${c.code}`}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No certificates yet.</p>
        )}
      </AccountSection>

      <section id="credits" className="scroll-mt-24">
        <AccountSection
          title="Plan & credits"
          description={
            account.plan === "pro"
              ? `You're on Pro${renews ? ` until ${renews}` : ""}. Buying another Pro pass adds ${PRO_DAYS} days.`
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
              <div key={pack.id} className="flex flex-col rounded-lg border p-4">
                <p className="font-semibold">{pack.credits} credits</p>
                <p className="mb-3 text-sm text-muted-foreground">₹{pack.priceInr} · one-time</p>
                <div className="mt-auto">
                  {payments ? <BuyButton productId={pack.id} label={`Buy for ₹${pack.priceInr}`} /> : <ComingSoon />}
                </div>
              </div>
            ))}
            <div className="flex flex-col rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="font-semibold">Pro · {PRO_DAYS} days</p>
              <p className="mb-3 text-sm text-muted-foreground">
                ₹{PRO_PRICE_INR} · {PLANS.pro.askDay} questions a day, {PLANS.pro.coursesMonth} courses a month. No
                auto-renewal.
              </p>
              <div className="mt-auto">
                {payments ? (
                  <BuyButton
                    productId="pro30"
                    label={account.plan === "pro" ? `Add ${PRO_DAYS} days · ₹${PRO_PRICE_INR}` : `Get Pro · ₹${PRO_PRICE_INR}`}
                    variant="default"
                  />
                ) : (
                  <ComingSoon />
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Secure payment by Razorpay (UPI, cards, netbanking). Prices include taxes. See our{" "}
            <Link href="/refund-policy" className="underline hover:text-foreground">
              refund policy
            </Link>
            .
          </p>
          {orders.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium">Payment history</p>
              <ul className="mt-2 divide-y rounded-lg border text-sm">
                {orders.map((o) => (
                  <li key={o.razorpay_order_id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span>
                      {PRODUCTS[o.product as ProductId]?.label ?? o.product}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(o.paid_at ?? o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {o.razorpay_payment_id ? ` · ${o.razorpay_payment_id}` : ""}
                      </span>
                    </span>
                    <span className="tabular-nums">₹{(o.amount_paise / 100).toFixed(0)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AccountSection>
      </section>

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
