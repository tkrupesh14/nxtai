import { DIAGRAM_KINDS, type Diagram } from "@/lib/learning/schemas"

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "")

/** Make an AI-written diagram safe to draw: trim text, cap sizes, fix links. Null if it can't be drawn. */
export function cleanDiagram(raw: unknown): Diagram | null {
  if (!raw || typeof raw !== "object") return null
  const d = raw as Partial<Diagram>
  if (!d.kind || !(DIAGRAM_KINDS as readonly string[]).includes(d.kind)) return null

  if (d.kind === "comparison") {
    const columns = (Array.isArray(d.columns) ? d.columns : []).map((c) => clip(c, 40)).filter(Boolean).slice(0, 4)
    if (columns.length < 2) return null
    const rows = (Array.isArray(d.rows) ? d.rows : [])
      .map((r) => ({
        label: clip(r?.label, 60),
        cells: columns.map((_, i) => clip(Array.isArray(r?.cells) ? r.cells[i] : "", 120)),
      }))
      .filter((r) => r.label && r.cells.some(Boolean))
      .slice(0, 8)
    if (rows.length < 1) return null
    return { kind: "comparison", items: [], columns, rows }
  }

  const max = d.kind === "hierarchy" ? 12 : d.kind === "timeline" ? 10 : 8
  const items = (Array.isArray(d.items) ? d.items : [])
    .map((it) => ({ label: clip(it?.label, 40), detail: clip(it?.detail, 140), parent: typeof it?.parent === "number" ? it.parent : null }))
    .filter((it) => it.label)
    .slice(0, max)
  if (items.length < (d.kind === "hierarchy" ? 2 : 3)) return null

  if (d.kind === "hierarchy") {
    // Item 0 is the root; every other item must point at an earlier item (else hang it off the root).
    items[0].parent = null
    items.forEach((it, i) => {
      if (i > 0 && (it.parent === null || !Number.isInteger(it.parent) || it.parent < 0 || it.parent >= i)) it.parent = 0
    })
  } else {
    items.forEach((it) => (it.parent = null))
  }
  return { kind: d.kind, items, columns: [], rows: [] }
}

/** Plain-text version for the professor chat's context. */
export function diagramText(d: Diagram): string {
  if (d.kind === "comparison") {
    return [`Comparison: ${d.columns.join(" vs ")}`, ...d.rows.map((r) => `- ${r.label}: ${r.cells.join(" | ")}`)].join("\n")
  }
  return [`${d.kind[0].toUpperCase()}${d.kind.slice(1)} diagram:`, ...d.items.map((it, i) => `${i + 1}. ${it.label}${it.detail ? `: ${it.detail}` : ""}`)].join("\n")
}
