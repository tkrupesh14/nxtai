"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { AuthError } from "@supabase/supabase-js"

import { Button } from "@/components/site/ui/button"
import { Input } from "@/components/site/ui/input"
import { Label } from "@/components/site/ui/label"
import { createClient } from "@/lib/supabase/client"

// Email + password auth runs in the browser (like OAuth) so Supabase's per-IP rate limits
// apply to each learner, not to our server's single IP.

export const MIN_PASSWORD = 8

function messageFor(error: AuthError | Error): string {
  const code = "code" in error ? (error as AuthError).code : undefined
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them, or reset your password."
    case "email_not_confirmed":
      return "Please confirm your email first. We can send the link again."
    case "over_email_send_rate_limit":
      return "We've sent too many emails to this address. Please wait a few minutes and try again."
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a minute and try again."
    case "weak_password":
      return `Please choose a stronger password (at least ${MIN_PASSWORD} characters, mixing letters and numbers).`
    case "same_password":
      return "Your new password must be different from the old one."
    case "email_address_invalid":
      return "Please enter a valid email address."
    case "signup_disabled":
      return "New sign-ups are paused right now. Please try again later."
    default:
      console.error("auth error:", code, error.message)
      return "Something went wrong. Please try again."
  }
}

function callbackUrl(next: string, flow: "signup" | "reset") {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&flow=${flow}`
}

function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
          : "rounded-md border bg-muted/50 px-3 py-2 text-sm"
      }
    >
      {children}
    </div>
  )
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: "current-password" | "new-password"
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={autoComplete === "new-password" ? MIN_PASSWORD : undefined}
        maxLength={72}
        className="pr-16"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 px-3 text-xs text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  )
}

function CheckEmail({ email, title, lead }: { email: string; title: string; lead: string }) {
  return (
    <div className="grid gap-2 text-center" role="status">
      <p className="text-3xl" aria-hidden>
        📬
      </p>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground text-pretty">
        {lead}{" "}
        <span className="font-medium text-foreground">{email}</span>. Open it on this device and browser.
      </p>
      <p className="text-xs text-muted-foreground">Can't find it? Check spam or promotions.</p>
    </div>
  )
}

export function EmailLoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setInfo(null)
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setUnconfirmed(error.code === "email_not_confirmed")
      setError(messageFor(error))
      setPending(false)
      return
    }
    router.replace(next)
    router.refresh()
  }

  async function resend() {
    setPending(true)
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl("/onboarding", "signup") },
    })
    setPending(false)
    if (error) return setError(messageFor(error))
    setError(null)
    setUnconfirmed(false)
    setInfo(`We've sent a new confirmation link to ${email.trim()}.`)
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
      </div>
      {error && (
        <Alert>
          {error}
          {unconfirmed && (
            <button type="button" onClick={resend} disabled={pending} className="ml-1 font-medium underline">
              Resend link
            </button>
          )}
        </Alert>
      )}
      {info && <Alert tone="info">{info}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Log in"}
      </Button>
    </form>
  )
}

export function EmailSignupForm({ next = "/onboarding" }: { next?: string }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`)
    if (!/[a-z]/i.test(password) || !/\d/.test(password)) return setError("Use a mix of letters and numbers in your password.")
    setPending(true)
    setError(null)
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      // full_name is read by the on_auth_user_created trigger to create the profile row.
      options: { data: { full_name: name.trim() }, emailRedirectTo: callbackUrl(next, "signup") },
    })
    setPending(false)
    if (error) return setError(messageFor(error))
    // Email confirmation off: signed in already. On (or the email is taken): "check your email",
    // which deliberately doesn't reveal whether the address already had an account.
    if (data.session) {
      router.replace(next)
      router.refresh()
      return
    }
    setSentTo(email.trim())
  }

  if (sentTo) {
    return <CheckEmail email={sentTo} title="Confirm your email" lead="We've sent a confirmation link to" />
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="signup-name">Your name</Label>
        <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <PasswordInput id="signup-password" value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD} characters, with letters and numbers.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  )
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl("/reset-password", "reset"),
    })
    setPending(false)
    // Same message whether or not the account exists; only show real problems like rate limits.
    if (error && error.code !== "user_not_found") return setError(messageFor(error))
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <CheckEmail
        email={sentTo}
        title="Check your email"
        lead="If there's an account for this address, we've sent a password reset link to"
      />
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for your password.`)
    if (!/[a-z]/i.test(password) || !/\d/.test(password)) return setError("Use a mix of letters and numbers in your password.")
    if (password !== confirm) return setError("The two passwords don't match.")
    setPending(true)
    setError(null)
    const { error } = await createClient().auth.updateUser({ password })
    if (error) {
      setPending(false)
      return setError(messageFor(error))
    }
    router.replace("/learn")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="reset-password">New password</Label>
        <PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reset-confirm">Confirm new password</Label>
        <PasswordInput id="reset-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </div>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  )
}
