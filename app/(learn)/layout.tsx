import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { ErrorReporter } from "@/components/error-reporter"
import { NavigationProgress } from "@/components/site/navigation-progress"
import { OfflineScreen } from "@/components/site/offline-screen"
import { LearnHeader } from "@/components/learn/learn-header"
import { devanagari } from "@/lib/fonts"
import "katex/dist/katex.min.css"
import "../(site)/site.css"
import "./learn.css"

export const metadata: Metadata = {
  title: "My learning — Krpex",
  robots: { index: false },
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen font-sans antialiased ${GeistSans.variable} ${GeistMono.variable} ${devanagari.variable}`}>
        <LearnHeader />
        {children}
        <ErrorReporter />
        <NavigationProgress />
        <OfflineScreen />
      </body>
    </html>
  )
}
