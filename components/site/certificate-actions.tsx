"use client"

import { useState } from "react"

import { Button } from "@/components/site/ui/button"

/** Save as PDF, copy link and add to LinkedIn. Hidden when printing. */
export function CertificateActions({ url, linkedIn }: { url: string; linkedIn: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-wrap justify-center gap-3 print:hidden">
      <Button onClick={() => window.print()}>Save as PDF</Button>
      <Button
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          } catch {
            window.prompt("Copy this link", url)
          }
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </Button>
      <Button asChild variant="outline">
        <a href={linkedIn} target="_blank" rel="noopener noreferrer">
          Add to LinkedIn
        </a>
      </Button>
    </div>
  )
}
