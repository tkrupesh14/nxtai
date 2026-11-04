import { describe, expect, it } from "vitest"

import { emptyBlock, firstProblem, fromStored, lessonTemplate, ModelLessonSchema, toLessonBlocks } from "@/lib/teach/lessons"

const good = () => {
  const l = lessonTemplate("hi")
  l.title = "न्यूटन के गति के नियम"
  l.blocks = [
    { ...emptyBlock("opening"), body_markdown: "आज हम बल के बारे में सीखेंगे।" },
    { ...emptyBlock("objectives"), items: ["Newton's first law"] },
    {
      ...emptyBlock("checkpoint"),
      checkpoint: { question: "Which law?", options: ["First", "Second", "Third", "None"], answer_index: 1, explanation: "F = ma." },
    },
  ]
  return l
}

describe("model lessons", () => {
  it("accepts a filled-in lesson (in Hindi too)", () => {
    expect(ModelLessonSchema.safeParse(good()).success).toBe(true)
    expect(firstProblem(good())).toBeNull()
  })

  it("explains what's missing", () => {
    const l = good()
    l.title = ""
    expect(firstProblem(l)).toBe("Give the lesson a title.")
    const empty = good()
    empty.blocks[0].body_markdown = " "
    expect(firstProblem(empty)).toBe("Block 1: The opening block is empty.")
    const q = good()
    q.blocks[2].checkpoint!.options[3] = ""
    expect(firstProblem(q)).toBe("Block 3: Fill in all four options.")
  })

  it("starts new lessons from a class-shaped template", () => {
    expect(lessonTemplate("en").blocks.map((b) => b.type)).toEqual(["opening", "objectives", "explanation", "worked_example", "checkpoint", "summary"])
  })

  it("round-trips through storage and drops unknown blocks", () => {
    const stored = JSON.parse(JSON.stringify(toLessonBlocks(good().blocks)))
    stored.push({ type: "diagram", title: "x", body_markdown: "", items: [], checkpoint: null, diagram: { kind: "flow" } })
    stored.push("junk")
    expect(fromStored(stored)).toEqual(good().blocks)
    expect(toLessonBlocks(good().blocks)[0]).toHaveProperty("diagram", null)
  })
})
