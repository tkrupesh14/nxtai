import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { ErrorReporter } from "@/components/error-reporter"
import { CursorTrail } from "@/components/site/cursor-trail"
import { Footer } from "@/components/site/footer"
import { Navbar } from "@/components/site/navbar"
import "./site.css"

const DESCRIPTION =
  "Krpex builds a personal course for whatever you want to learn, taught by an AI professor: class-style lessons, quizzes and answers to your questions."

export const metadata: Metadata = {
  metadataBase: new URL("https://krpex.in"),
  title: "Krpex — Your personal AI professor",
  description: DESCRIPTION,
  applicationName: "Krpex",
  // Pages without their own openGraph title fall back to the page <title>.
  openGraph: { siteName: "Krpex", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <Navbar />
        {children}
        <Footer />
        <CursorTrail />
        <ErrorReporter />
      </body>
    </html>
  )
}
