import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

import { CodeHeader } from "@/components/code/code-header"
import { ErrorReporter } from "@/components/error-reporter"
import { NavigationProgress } from "@/components/site/navigation-progress"
import { CODE_ORIGIN } from "@/lib/code-host"
import "../../(site)/site.css"
import "./code.css"

const DESCRIPTION = "Practise Python and JavaScript in your browser: write code, run it instantly and learn with Krpex."

export const metadata: Metadata = {
  metadataBase: new URL(CODE_ORIGIN),
  title: { default: "Krpex Code — practise coding in your browser", template: "%s — Krpex Code" },
  description: DESCRIPTION,
  applicationName: "Krpex Code",
  openGraph: { siteName: "Krpex Code", type: "website", locale: "en_IN", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
}

export default function CodeLayout({ children }: { children: React.ReactNode }) {
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
        <CodeHeader />
        {children}
        <ErrorReporter />
        <NavigationProgress />
      </body>
    </html>
  )
}
