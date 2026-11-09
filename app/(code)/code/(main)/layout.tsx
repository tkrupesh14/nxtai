import type React from "react"

import { CodeHeader } from "@/components/code/code-header"

/** Pages with the site header. The problem workspace (/p/<slug>) has its own top bar. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CodeHeader />
      {children}
    </>
  )
}
