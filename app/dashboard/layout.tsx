import type { ReactNode } from "react"
import DashboardSidebarServer from "@/components/dashboard/dashboard-sidebar-server"
import DashboardHedaerServer from "@/components/dashboard/dashboard-header-server"
import FloatingParticles from "@/components/floating-particles"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-900/0 to-black z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,_rgba(255,255,255,0.01)_1px,_transparent_1px),_linear-gradient(to_bottom,_rgba(255,255,255,0.01)_1px,_transparent_1px)] bg-[size:4rem_4rem] z-0"></div>

      <FloatingParticles count={15} color="violet" />

      {/* Sidebar */}
      <DashboardSidebarServer />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10">
        <DashboardHedaerServer />
        <main className="flex-1 overflow-auto p-6 pb-20 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
