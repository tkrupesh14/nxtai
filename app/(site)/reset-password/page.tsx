import Link from "next/link"

import { ResetPasswordForm } from "@/components/site/email-auth"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Set a new password · NxtAI" }

// Reached from the reset email via /auth/callback, which signs the user in first.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Set a new password</h1>
        {user?.email && <p className="mt-2 text-muted-foreground">for {user.email}</p>}
      </div>
      <section className="rounded-lg border bg-card p-6">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="grid gap-4 text-center">
            <p className="text-sm text-muted-foreground text-pretty">
              This page only works from the link in your reset email, opened in the same browser where you asked for it.
            </p>
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Send me a new link
            </Link>
          </div>
        )}
      </section>
    </main>
  )
}
