import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { ErrorReporter } from "@/components/error-reporter"
import { LearnHeader } from "@/components/learn/learn-header"
import "../(site)/site.css"
import "./learn.css"

export const metadata: Metadata = {
  title: "My learning — Krpex",
  robots: { index: false },
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`min-h-screen font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <LearnHeader />
        {children}
        <ErrorReporter />
      </body>
    </html>
  )
}
