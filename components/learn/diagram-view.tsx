import { cleanDiagram } from "@/lib/learning/diagram"
import type { Diagram } from "@/lib/learning/schemas"
import { cn } from "@/lib/utils"

type Item = Diagram["items"][number]

function Node({ item, n, className }: { item: Item; n?: number; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border bg-background px-3 py-2", className)}>
      <p className="text-sm font-semibold leading-snug">
        {n !== undefined ? <span className="mr-1.5 text-primary tabular-nums">{n}.</span> : null}
        {item.label}
      </p>
      {item.detail ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.detail}</p> : null}
    </div>
  )
}

function Arrow({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center text-primary", className)}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </span>
  )
}

function Flow({ items }: { items: Item[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-1 md:flex-row md:flex-wrap md:items-center md:gap-2">
      {items.map((it, i) => (
        <li key={i} className="flex min-w-0 flex-col items-stretch gap-1 md:flex-row md:items-center md:gap-2">
          <Node item={it} n={i + 1} className="md:max-w-52" />
          {i < items.length - 1 ? <Arrow className="md:-rotate-90" /> : null}
        </li>
      ))}
    </ol>
  )
}

function Cycle({ items }: { items: Item[] }) {
  const n = items.length
  const r = 70
  const pts = items.map((_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) }
  })
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
      <svg viewBox="0 0 200 200" className="mx-auto w-44 text-primary" aria-hidden>
        <defs>
          <marker id="cyc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>
        {pts.map((p, i) => {
          const q = pts[(i + 1) % n]
          // Shorten each arc so arrows stop at the next circle.
          const dx = q.x - p.x
          const dy = q.y - p.y
          const len = Math.hypot(dx, dy) || 1
          const s = 17 / len
          return (
            <line
              key={i}
              x1={p.x + dx * s}
              y1={p.y + dy * s}
              x2={q.x - dx * s}
              y2={q.y - dy * s}
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity="0.6"
              markerEnd="url(#cyc-arrow)"
            />
          )
        })}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="14" fill="currentColor" />
            <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" className="fill-primary-foreground text-[12px] font-semibold">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <ol className="grid gap-2">
        {items.map((it, i) => (
          <li key={i}>
            <Node item={it} n={i + 1} />
          </li>
        ))}
        <li className="text-xs text-muted-foreground">↻ Then back to step 1.</li>
      </ol>
    </div>
  )
}

function Tree({ items, index, depth }: { items: Item[]; index: number; depth: number }) {
  const children = items.map((it, i) => ({ it, i })).filter(({ it, i }) => i !== index && it.parent === index)
  return (
    <li className={cn("min-w-0", depth > 0 && "relative pl-5 before:absolute before:top-5 before:left-0 before:h-px before:w-4 before:bg-border")}>
      <Node item={items[index]} className={depth === 0 ? "border-primary/50 bg-primary/5" : undefined} />
      {children.length > 0 && depth < 6 ? (
        <ul className="mt-2 ml-3 grid gap-2 border-l pl-0">
          {children.map(({ i }) => (
            <Tree key={i} items={items} index={i} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function Comparison({ d }: { d: Diagram }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium" />
            {d.columns.map((c, i) => (
              <th key={i} scope="col" className="px-3 py-2 text-left font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              <th scope="row" className="px-3 py-2 text-left font-medium text-muted-foreground">
                {r.label}
              </th>
              {r.cells.map((c, j) => (
                <td key={j} className="px-3 py-2">
                  {c || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Timeline({ items }: { items: Item[] }) {
  return (
    <ol className="relative ml-2 grid gap-4 border-l-2 border-primary/30 pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative min-w-0">
          <span aria-hidden className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-background bg-primary" />
          <p className="text-xs font-semibold tracking-wide text-primary">{it.label}</p>
          {it.detail ? <p className="text-sm">{it.detail}</p> : null}
        </li>
      ))}
    </ol>
  )
}

/** Draws a lesson diagram from its data. Renders nothing if the data can't be drawn. */
export function DiagramView({ diagram }: { diagram: unknown }) {
  const d = cleanDiagram(diagram)
  if (!d) return null
  switch (d.kind) {
    case "flow":
      return <Flow items={d.items} />
    case "cycle":
      return <Cycle items={d.items} />
    case "hierarchy":
      return (
        <ul className="grid gap-2">
          <Tree items={d.items} index={0} depth={0} />
        </ul>
      )
    case "comparison":
      return <Comparison d={d} />
    case "timeline":
      return <Timeline items={d.items} />
  }
}
