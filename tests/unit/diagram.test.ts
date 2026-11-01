import { describe, expect, it } from "vitest"

import { cleanDiagram, diagramText } from "@/lib/learning/diagram"

const item = (label: string, parent: number | null = null) => ({ label, detail: "", parent })

describe("cleanDiagram", () => {
  it("rejects junk", () => {
    expect(cleanDiagram(null)).toBeNull()
    expect(cleanDiagram({ kind: "pie", items: [] })).toBeNull()
    expect(cleanDiagram({ kind: "flow", items: [item("a"), item("b")] })).toBeNull() // too few steps
  })

  it("caps and trims a flow", () => {
    const d = cleanDiagram({ kind: "flow", items: Array.from({ length: 12 }, (_, i) => item(`  step ${i}  `, 3)) })
    expect(d?.items).toHaveLength(8)
    expect(d?.items[0]).toEqual({ label: "step 0", detail: "", parent: null })
  })

  it("re-hangs broken hierarchy links on the root", () => {
    const d = cleanDiagram({ kind: "hierarchy", items: [item("root", 5), item("a", 0), item("b", 7), item("c", 2), item("d", -1)] })
    expect(d?.items.map((i) => i.parent)).toEqual([null, 0, 0, 2, 0]) // "c" keeps its valid parent "b"
  })

  it("keeps comparison cells aligned to columns", () => {
    const d = cleanDiagram({
      kind: "comparison",
      columns: ["SQL", "NoSQL", ""],
      rows: [{ label: "Schema", cells: ["Fixed", "Flexible", "extra"] }, { label: "", cells: ["x", "y"] }],
    })
    expect(d?.columns).toEqual(["SQL", "NoSQL"])
    expect(d?.rows).toEqual([{ label: "Schema", cells: ["Fixed", "Flexible"] }])
    expect(diagramText(d!)).toContain("Schema: Fixed | Flexible")
  })
})
