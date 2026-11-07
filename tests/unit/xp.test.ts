import { describe, expect, it } from "vitest"

import { xpLevel } from "@/lib/learning/xp"

describe("xpLevel", () => {
  it("starts level L at 25·L·(L−1) XP", () => {
    expect(xpLevel(0)).toEqual({ level: 1, total: 0, into: 0, span: 50, toNext: 50 })
    expect(xpLevel(49).level).toBe(1)
    expect(xpLevel(50)).toEqual({ level: 2, total: 50, into: 0, span: 100, toNext: 100 })
    expect(xpLevel(149).level).toBe(2)
    expect(xpLevel(150).level).toBe(3)
    expect(xpLevel(420)).toEqual({ level: 4, total: 420, into: 120, span: 200, toNext: 80 })
    for (let l = 1; l < 200; l++) {
      expect(xpLevel(25 * l * (l - 1)).level).toBe(l)
      expect(xpLevel(25 * l * (l - 1) - 1).level).toBe(Math.max(1, l - 1))
    }
  })

  it("treats bad input as 0", () => {
    expect(xpLevel(-5).level).toBe(1)
    expect(xpLevel(Number.NaN).total).toBe(0)
  })
})
