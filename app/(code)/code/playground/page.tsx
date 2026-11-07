import type { Metadata } from "next"

import { Playground } from "@/components/code/playground"

export const metadata: Metadata = {
  title: "Playground",
  description: "Write and run Python or JavaScript in your browser. Nothing to install.",
}

export default function PlaygroundPage() {
  return (
    <main>
      <h1 className="sr-only">Code playground</h1>
      <Playground />
    </main>
  )
}
