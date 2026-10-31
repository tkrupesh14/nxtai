export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14" aria-busy="true">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-10 grid gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  )
}
