import type { ReactNode } from "react"
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}

