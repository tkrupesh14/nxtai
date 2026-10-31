import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { CursorTrail } from "@/components/site/cursor-trail"
import { Footer } from "@/components/site/footer"
import { Navbar } from "@/components/site/navbar"
import "./site.css"

export const metadata: Metadata = {
  title: "NxtAI — AI-first LMS",
  description:
    "NxtAI is the AI-integrated LMS for content generation, assessments, proctored coding, communities, mock interviews, and rewards.",
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <Navbar />
        {children}
        <Footer />
        <CursorTrail />
      </body>
    </html>
  )
}
