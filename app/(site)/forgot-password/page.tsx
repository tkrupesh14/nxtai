import Link from "next/link"

import { ForgotPasswordForm } from "@/components/site/email-auth"

export const metadata = { title: "Reset your password · Krpex" }

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Forgot your password?</h1>
        <p className="mt-2 text-muted-foreground text-pretty">Enter your email and we'll send you a link to set a new one.</p>
      </div>
      <section className="rounded-lg border bg-card p-6">
        <ForgotPasswordForm />
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </main>
  )
}
