import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { CommunityHeader } from "@/components/community/community-header"
import { ErrorReporter } from "@/components/error-reporter"
import { NavigationProgress } from "@/components/site/navigation-progress"
import { COMMUNITY_ORIGIN } from "@/lib/code-host"
import "../../(site)/site.css"

// Krpex Community (5.6) on community.krpex.in: profiles now; solutions, discussions and boards next (plan.md Phase 5).

const DESCRIPTION = "Learners on Krpex: public profiles, shared solutions and discussions about coding and courses."

export const metadata: Metadata = {
  metadataBase: new URL(COMMUNITY_ORIGIN),
  title: { default: "Krpex Community", template: "%s — Krpex Community" },
  description: DESCRIPTION,
  applicationName: "Krpex Community",
  openGraph: { siteName: "Krpex Community", type: "website", locale: "en_IN", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
}

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint (same setting as the main site's toggle). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className={`min-h-screen bg-background font-sans text-foreground antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <CommunityHeader />
        {children}
        <ErrorReporter />
        <NavigationProgress />
      </body>
    </html>
  )
}
