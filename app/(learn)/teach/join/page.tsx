import Link from "next/link"

import { AccountSection } from "@/components/learn/account-section"
import { AgreementText } from "@/components/teach/agreement-text"
import { JoinForm } from "@/components/teach/join-form"
import { getCurrentProfile } from "@/lib/supabase/profile"
import { createClient } from "@/lib/supabase/server"
import { subjectName } from "@/lib/teach/subjects"

export const metadata = { title: "Join as a professor — Krpex" }

type Status = { status: "ok" | "wrong_email" | "used" | "expired" | "not_found" | "already_professor"; subject?: string; hint?: string }

const MESSAGES: Record<Exclude<Status["status"], "ok">, { title: string; body: React.ReactNode }> = {
  already_professor: { title: "You're already a Krpex professor", body: <Link href="/teach" className="text-primary hover:underline">Go to your teaching space</Link> },
  used: { title: "This invite was already used", body: "Each invite works once. If that wasn't you, contact Krpex." },
  expired: { title: "This invite has expired", body: "Invites last 14 days. Ask Krpex for a new one." },
  not_found: { title: "This invite link isn't valid", body: "Check that you copied the whole link, or ask Krpex for a new one." },
  wrong_email: { title: "This invite is for a different email", body: "" },
}

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams
  const supabase = await createClient()
  const [{ data }, { user, profile }] = await Promise.all([
    supabase.rpc("professor_invite_status", { p_token: token.slice(0, 200) }),
    getCurrentProfile(),
  ])
  const s = (data ?? { status: "not_found" }) as Status

  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-4 py-10 md:py-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Teach with Krpex</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Help Krpex&apos;s AI teach the way you do. Share your material and corrections, and learners get an AI professor
          based on your teaching, always labelled as AI.
        </p>
      </div>
      {s.status === "ok" ? (
        <>
          <AccountSection title={`Invitation: ${subjectName(s.subject ?? "")} professor`} description="Please read this before you join.">
            <AgreementText />
          </AccountSection>
          <AccountSection title="Join">
            <JoinForm token={token} defaultName={profile.full_name ?? ""} />
          </AccountSection>
        </>
      ) : (
        <AccountSection title={MESSAGES[s.status].title}>
          <p className="text-sm text-muted-foreground">
            {s.status === "wrong_email" ? (
              <>
                You&apos;re signed in as {user.email}, but the invite was sent to {s.hint}. Log out and sign in with that
                email, then open the link again.
              </>
            ) : (
              MESSAGES[s.status].body
            )}
          </p>
        </AccountSection>
      )}
    </main>
  )
}
