import { cn } from "@/lib/utils"

export function AccountSection({
  title,
  description,
  tone,
  id,
  children,
}: {
  id?: string
  title: string
  description?: React.ReactNode
  tone?: "danger"
  children: React.ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-xl border bg-card p-5 md:p-6", tone === "danger" && "border-destructive/40")}>
      <h2 className={cn("font-semibold", tone === "danger" && "text-destructive-foreground")}>{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground text-pretty">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
