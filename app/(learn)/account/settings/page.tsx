import { signOutEverywhere } from "@/app/(learn)/account/actions"
import { DeleteAccountForm, EmailSettingsForm, PasswordForm, type EmailSettings } from "@/components/learn/account-forms"
import { AccountSection } from "@/components/learn/account-section"
import { Button } from "@/components/site/ui/button"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/supabase/profile"
import { getMyProfessor } from "@/lib/teach/data"

const PROVIDER_LABELS: Record<string, string> = { email: "Email & password", github: "GitHub", google: "Google" }

export const metadata = { title: "Settings — Krpex" }

export default async function SettingsPage() {
  const { user } = await getCurrentProfile()
  const supabase = await createClient()
  const [{ data: emailRow }, professor, { data: isAdmin }] = await Promise.all([
    supabase.from("notification_email_settings").select("frequency, learning, account, teaching, admin").maybeSingle(),
    getMyProfessor(),
    supabase.rpc("is_admin"),
  ])
  const email: EmailSettings = (emailRow as EmailSettings | null) ?? {
    frequency: "hourly",
    learning: true,
    account: true,
    teaching: true,
    admin: true,
  }
  const providers = Array.from(
    new Set([...(user.identities ?? []).map((i) => i.provider), ...((user.app_metadata?.providers as string[] | undefined) ?? [])]),
  )
  const hasPassword = providers.includes("email")

  return (
    <>
      <AccountSection
        title={hasPassword ? "Password" : "Add a password"}
        description={
          hasPassword
            ? "Change the password you use to log in with your email."
            : `You sign in with ${providers.map((p) => PROVIDER_LABELS[p] ?? p).join(" and ")}. Add a password to also log in with ${user.email}.`
        }
      >
        <PasswordForm hasPassword={hasPassword} />
      </AccountSection>

      <AccountSection
        id="email"
        title="Email notifications"
        description={`We email ${user.email} about notifications you haven't seen in the app. Sign-in and password emails are always sent.`}
      >
        <EmailSettingsForm values={email} isProfessor={Boolean(professor)} isAdmin={Boolean(isAdmin)} />
      </AccountSection>

      <AccountSection title="Sign-in methods">
        <ul className="grid gap-2 text-sm">
          {providers.map((p) => (
            <li key={p} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span>{PROVIDER_LABELS[p] ?? p}</span>
              <span className="text-xs text-muted-foreground">Connected</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Account email: {user.email}</p>
      </AccountSection>

      <AccountSection
        title="Devices"
        description="Lost a phone or used a shared computer? Sign out everywhere, including this device."
      >
        <form action={signOutEverywhere}>
          <Button type="submit" variant="outline">
            Sign out of all devices
          </Button>
        </form>
      </AccountSection>

      <AccountSection
        tone="danger"
        title="Delete account"
        description="Permanently deletes your account, courses, lessons, quiz progress and professor chats. This can't be undone."
      >
        <DeleteAccountForm />
      </AccountSection>
    </>
  )
}
