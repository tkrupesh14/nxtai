import { describe, expect, it } from "vitest"

import { istDay, learningStats, weekdayName } from "@/lib/learning/stats"

// "now" = Thu 2026-11-05 10:00 IST
const now = Date.parse("2026-11-05T04:30:00Z")
const L = (t: string | null, best_score: number | null = 80, est_minutes: number | null = 30) => ({
  completed_at: t,
  best_score,
  est_minutes,
})

describe("learningStats", () => {
  it("counts days in IST and keeps a streak that ended yesterday", () => {
    // 23:00 IST on Nov 4 is 17:30 UTC: still Nov 4 in India.
    const s = learningStats([L("2026-11-04T17:30:00Z"), L("2026-11-03T05:00:00Z", 60), L(null)], ["2026-11-02T06:00:00Z"], now)
    expect(s.streak).toBe(3)
    expect(s.activeToday).toBe(false)
    expect(s.lessonsDone).toBe(2)
    expect(s.avgScore).toBe(70)
    expect(s.minutes).toBe(60)
    expect(s.week).toHaveLength(7)
    expect(s.week[5].lessons).toBe(1) // yesterday
    expect(s.week[3]).toMatchObject({ lessons: 0, active: true }) // question only
  })

  it("treats 00:30 IST as the new day", () => {
    const s = learningStats([L("2026-11-04T19:00:00Z")], [], now)
    expect(s.activeToday).toBe(true)
    expect(s.streak).toBe(1)
  })

  it("breaks the streak after a missed day but remembers the best", () => {
    const s = learningStats(
      [L("2026-10-01T05:00:00Z"), L("2026-10-02T05:00:00Z"), L("2026-10-03T05:00:00Z"), L("2026-11-05T01:00:00Z")],
      [],
      now,
    )
    expect(s.streak).toBe(1)
    expect(s.bestStreak).toBe(3)
  })

  it("handles a brand-new learner", () => {
    const s = learningStats([], [], now)
    expect(s).toMatchObject({ streak: 0, bestStreak: 0, lessonsDone: 0, minutes: 0, avgScore: null })
  })

  it("assumes 30 minutes when a lesson has no length", () => {
    expect(learningStats([L("2026-11-05T01:00:00Z", null, null)], [], now)).toMatchObject({ minutes: 30, avgScore: null })
  })

  it("counts study days from the XP ledger and days covered by a streak freeze", () => {
    // Studied Nov 1–2 (course since deleted) and Nov 4; Nov 3 was missed and frozen.
    const s = learningStats([L("2026-11-04T05:00:00Z")], [], now, { studyDays: ["2026-11-01", "2026-11-02"], frozenDays: ["2026-11-03"] })
    expect(s.streak).toBe(4)
    expect(s.week[4]).toMatchObject({ lessons: 0, active: true, frozen: true }) // Nov 3
    expect(s.week[5]).toMatchObject({ lessons: 1, frozen: false })
  })

  it("names weekdays", () => {
    expect(weekdayName(istDay(now))).toBe("Thu")
  })
})
