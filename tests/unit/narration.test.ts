import { describe, expect, it } from "vitest"

import { chunkSpeech, sectionSpeech, speakBlock, speakMarkdown, speakMath } from "@/lib/learning/narration"
import type { LessonBlock } from "@/lib/learning/schemas"

const block = (b: Partial<LessonBlock>): LessonBlock => ({
  type: "explanation",
  title: "",
  body_markdown: "",
  items: [],
  checkpoint: null,
  diagram: null,
  ...b,
})

describe("speakMarkdown", () => {
  it("strips formatting but keeps the words", () => {
    expect(speakMarkdown("A **list** is _ordered_ and uses `append`. See [the docs](https://x.y).")).toBe(
      "A list is ordered and uses append. See the docs.",
    )
  })

  it("points at code and tables instead of reading them", () => {
    const md = "Look:\n\n```python\nprint('hi')\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nDone"
    const out = speakMarkdown(md)
    expect(out).toContain("code example on screen")
    expect(out).toContain("table on screen")
    expect(out).not.toContain("print")
    expect(out).not.toContain("|")
  })

  it("turns list lines into sentences", () => {
    expect(speakMarkdown("- one\n- two\n1. three")).toBe("one. two. three.")
  })

  it("keeps comparison signs in prose", () => {
    expect(speakMarkdown("If x < 5 and y > 3 it stops")).toBe("If x < 5 and y > 3 it stops.")
  })

  it("reads simple equations", () => {
    expect(speakMarkdown("So $$x^2 + 1 = 5$$ here")).toBe("So x squared plus 1 equals 5 here.")
  })
})

describe("speakMath", () => {
  it("reads fractions and roots", () => {
    expect(speakMath("\\frac{a}{b} = \\sqrt{c}")).toBe("a over b equals the square root of c")
  })
  it("gives up on complex TeX", () => {
    expect(speakMath("\\int_0^1 \\mathbb{R} dx")).toBe("the equation on screen")
  })
})

describe("speakBlock", () => {
  it("reads a checkpoint without giving the answer away", () => {
    const text = speakBlock(
      block({
        type: "checkpoint",
        title: "Quick check",
        checkpoint: { question: "What is 2+2?", options: ["3", "4", "5", "6"], answer_index: 1, explanation: "Because 4 is the answer" },
      }),
    )
    expect(text).toContain("Quick check.")
    expect(text).toContain("A: 3. B: 4.")
    expect(text).not.toContain("Because")
  })

  it("describes a diagram", () => {
    const text = speakBlock(
      block({
        type: "diagram",
        title: "Steps",
        diagram: { kind: "flow", items: [{ label: "Plan", detail: "decide", parent: null }, { label: "Build", detail: "", parent: null }], columns: [], rows: [] },
      }),
    )
    expect(text).toBe("Steps. Here are the steps. Plan: decide. Build.")
  })
})

describe("chunkSpeech", () => {
  it("keeps every piece under the limit and loses no words", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} talks about something, briefly.`).join(" ") +
      " " + "word ".repeat(120)
    const chunks = chunkSpeech(text, 200)
    expect(chunks.every((c) => c.length <= 200)).toBe(true)
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(text.replace(/\s+/g, " ").trim())
  })

  it("returns nothing for empty text", () => {
    expect(chunkSpeech("")).toEqual([])
    expect(sectionSpeech([])).toEqual([])
  })
})
