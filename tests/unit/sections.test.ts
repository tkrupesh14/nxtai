import { describe, expect, it } from "vitest"

import type { LessonBlock } from "@/lib/learning/schemas"
import { sectionLabel, sectionText, toSections } from "@/lib/learning/sections"

const b = (type: LessonBlock["type"], title = ""): LessonBlock => ({
  type,
  title,
  body_markdown: `${type} body`,
  items: [],
  checkpoint: null,
  diagram: null,
})

describe("lesson sections", () => {
  it("groups at most two blocks and ends a section at each checkpoint", () => {
    const s = toSections([b("opening"), b("objectives"), b("explanation"), b("checkpoint"), b("summary")])
    expect(s.map((x) => x.blocks.map((y) => y.block.type))).toEqual([["opening", "objectives"], ["explanation", "checkpoint"], ["summary"]])
    expect(s.map((x) => x.gated)).toEqual([false, true, false])
  })

  it("labels and summarises a section", () => {
    const [s] = toSections([b("explanation", "Recursion"), b("analogy")])
    expect(sectionLabel(s)).toBe("Recursion")
    expect(sectionText(s, 30)).toMatch(/…$/)
  })
})
