import { AGREEMENT, AGREEMENT_IS_DRAFT, AGREEMENT_VERSION } from "@/lib/teach/agreement"

export function AgreementText() {
  return (
    <div className="grid gap-4 text-sm leading-relaxed">
      {AGREEMENT_IS_DRAFT ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          Draft for the pilot ({AGREEMENT_VERSION}). It will be reviewed before professors are invited.
        </p>
      ) : null}
      {AGREEMENT.map((s) => (
        <section key={s.heading}>
          <h3 className="font-medium">{s.heading}</h3>
          <p className="mt-1 text-muted-foreground text-pretty">{s.body}</p>
        </section>
      ))}
    </div>
  )
}
