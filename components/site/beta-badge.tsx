import { cn } from "@/lib/utils"

/** "Beta" pill shown next to the site name in every header. */
export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      title="Krpex is in beta: things may change while we improve it"
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-primary/40 bg-primary/10 px-1.5 py-px align-middle text-[10px] font-semibold uppercase leading-4 tracking-wide text-primary",
        className,
      )}
    >
      Beta
    </span>
  )
}
