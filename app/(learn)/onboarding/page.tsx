import { OnboardingForm } from "@/components/learn/onboarding-form"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Build your course — NxtAI" }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("learner_profiles")
    .select("level, background, hours_per_week, learning_style, timeline")
    .maybeSingle()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 md:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Let&apos;s build your course</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Answer a few quick questions. NxtAI designs a learning path around your goal, level and schedule.
        </p>
      </div>
      <OnboardingForm defaults={profile ?? undefined} />
    </main>
  )
}
