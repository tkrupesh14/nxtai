import Link from "next/link"

import { OnboardingForm } from "@/components/learn/onboarding-form"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Build your course — Krpex" }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const [{ data: profile }, { data: allowance }] = await Promise.all([
    supabase.from("learner_profiles").select("level, background, hours_per_week, learning_style, timeline").maybeSingle(),
    supabase
      .rpc("course_allowance")
      .maybeSingle<{ allowed: boolean; reason: string | null; free_left: number; credits: number; cost: number }>(),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Let&apos;s build your course</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Answer a few quick questions. Krpex designs a learning path around your goal, level and schedule.
        </p>
      </div>
      {allowance && !allowance.allowed ? (
        <section className="rounded-xl border bg-card p-6 md:p-8">
          <p className="font-semibold">
            {allowance.reason === "daily_limit" ? "That's 3 new courses today" : "You've used this month's free courses"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            {allowance.reason === "daily_limit"
              ? "Come back tomorrow to create another one."
              : `Each extra course uses ${allowance.cost} credits, and you have ${allowance.credits}. Your free courses reset on the 1st of next month.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/learn" className="font-medium text-primary hover:underline">
              Continue my courses
            </Link>
            <Link href="/account" className="font-medium text-primary hover:underline">
              Credits & plans
            </Link>
          </div>
        </section>
      ) : (
        <>
          {allowance && (
            <p className="mb-4 rounded-md border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              {allowance.cost > 0
                ? `This course will use ${allowance.cost} of your ${allowance.credits} credits.`
                : `Free courses left this month: ${allowance.free_left}.`}
            </p>
          )}
          <OnboardingForm defaults={profile ?? undefined} />
        </>
      )}
    </main>
  )
}
