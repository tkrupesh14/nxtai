import { AccountTabs } from "@/components/learn/account-tabs"

export const metadata = { title: "Account — NxtAI" }

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
      <div className="mt-6">
        <AccountTabs />
      </div>
      <div className="mt-8 grid gap-6">{children}</div>
    </main>
  )
}
