import Link from "next/link"

import { AuthDivider } from "@/components/site/auth-divider"
import { EmailSignupForm } from "@/components/site/email-auth"
import { OAuthButtons } from "@/components/site/oauth-buttons"

export default function CreateAccountPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Create your Krpex account</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Answer a few questions and get your personalized course plan with AI.
        </p>
      </div>
      <section className="rounded-lg border bg-card p-6">
        <OAuthButtons next="/onboarding" />
        <AuthDivider />
        <EmailSignupForm />
      </section>
      <p className="mt-4 text-center text-xs text-muted-foreground text-pretty">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </main>
  )
}
