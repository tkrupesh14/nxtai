import { Spinner } from "@/components/site/ui/button"

/** The page shown while the next page loads (loading.tsx): a spinner and a rough outline of a page. */
export function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14" aria-busy="true">
      <div role="status" className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <Spinner className="text-primary" />
        {label}
      </div>
      <div className="mt-6 h-8 w-64 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-10 grid gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  )
}
