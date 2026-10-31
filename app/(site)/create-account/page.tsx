import Link from "next/link"

import { OAuthButtons } from "@/components/site/oauth-buttons"

export default function CreateAccountPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">Create your NxtAI account</h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          Answer a few questions and get your personalized course plan with AI.
        </p>
      </div>
      <section className="rounded-lg border bg-card p-6">
        <OAuthButtons />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/auth/signup" className="hover:text-foreground hover:underline">
            Sign up with email instead
          </Link>
        </p>
      </section>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </main>
  )
}
