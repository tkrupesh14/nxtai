// Krpex Code AI coach (v2 Phase 3): the guard that keeps hints from handing over the solution.
import { describe, expect, it } from "vitest"

import { coachLabel, nextHintStep, revealsSolution, withoutCode } from "@/lib/code/coach"
import { PROBLEMS } from "@/lib/code/problems"

describe("AI coach", () => {
  it("catches any reference solution pasted into a reply, in either language", () => {
    const missed: string[] = []
    for (const p of PROBLEMS)
      for (const lang of ["python", "javascript"] as const) {
        const sol = p.solution[lang]
        if (!revealsSolution(`Here you go:\n\n\`\`\`${lang}\n${sol}\n\`\`\``, sol) && sol.split("\n").length >= 4) missed.push(`${p.slug}:${lang}`)
      }
    expect(missed).toEqual([])
  })

  it("lets ordinary hints through", () => {
    const sol = PROBLEMS.find((p) => p.slug === "two-sum")!.solution.python
    expect(revealsSolution("Think about what number you'd need to *pair* with `nums[i]`. Could a dictionary remember what you've seen?", sol)).toBe(false)
    expect(revealsSolution("Try this line:\n\n```python\nseen[x] = i\n```", sol)).toBe(false)
    expect(revealsSolution("```\na\nb\nc\nd\n```", sol)).toBe(true)
  })

  it("strips code blocks as a last resort", () => {
    expect(withoutCode("Idea first.\n\n```js\nconst a = 1\n```\n\nThen test it.")).toBe("Idea first.\n\n_(code left out — try writing this part yourself)_\n\nThen test it.")
  })

  it("steps through hints 1 to 3", () => {
    expect(nextHintStep([])).toBe(1)
    expect(nextHintStep([{ kind: "error", step: 0 }, { kind: "hint", step: 1 }])).toBe(2)
    expect(nextHintStep([{ kind: "hint", step: 3 }])).toBe(3)
    expect(coachLabel({ kind: "hint", step: 2 })).toBe("Hint 2 of 3")
  })
})
