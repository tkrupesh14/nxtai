import Link from "next/link"

import { Button } from "@/components/site/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that</h1>
      <p className="mt-2 text-muted-foreground">The course or lesson doesn&apos;t exist, or it belongs to another account.</p>
      <Button asChild className="mt-6">
        <Link href="/learn">Go to my courses</Link>
      </Button>
    </main>
  )
}
