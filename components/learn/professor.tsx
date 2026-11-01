import type { Professor } from "@/lib/learning/catalog"
import { cn } from "@/lib/utils"

export function ProfessorAvatar({ professor, size = "md" }: { professor: Professor; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        professor.avatarClass,
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-11 text-sm",
        size === "lg" && "size-14 text-base",
      )}
    >
      {professor.initials}
    </div>
  )
}

/** Name, title and an explicit "AI professor" label: personas must never pass as real people. */
export function ProfessorCard({
  professor,
  note,
  className,
}: {
  professor: Professor
  note?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-start gap-4 rounded-xl border bg-card p-4", className)}>
      <ProfessorAvatar professor={professor} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold leading-tight">{professor.name}</p>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            AI professor
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{professor.title.replace(/^AI professor · /, "")}</p>
        {note ? <div className="mt-2 text-sm text-pretty">{note}</div> : null}
      </div>
    </div>
  )
}
