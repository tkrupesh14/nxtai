"use client"

import { useRef, useState } from "react"

/** Code block with a Copy button (used by the lesson Markdown renderer for fenced code). */
export function CodeBlock(props: React.ComponentProps<"pre">) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  async function copy() {
    const text = ref.current?.innerText ?? ""
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="code-block relative">
      <pre ref={ref} {...props} />
      <button
        type="button"
        onClick={copy}
        className="absolute top-1.5 right-1.5 rounded-md border bg-background/90 px-2 py-0.5 text-[11px] text-muted-foreground opacity-80 transition hover:text-foreground hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  )
}
