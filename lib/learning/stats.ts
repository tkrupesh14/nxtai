// Learner progress numbers for /learn, computed from lesson completions and professor questions.
// Days are counted in India time (IST, UTC+5:30), the same as the daily limits.

const IST_MS = 330 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** Day number (days since 1970-01-01) of a moment, in IST. */
export function istDay(t: string | number | Date) {
  return Math.floor((new Date(t).getTime() + IST_MS) / DAY_MS)
}

export type StatsLesson = { completed_at: string | null; best_score: number | null; est_minutes: number | null }

export type LearningStats = {
  streak: number
  bestStreak: number
  /** True when today already counts; false means the streak ends unless they study today. */
  activeToday: boolean
  lessonsDone: number
  minutes: number
  /** Average best quiz score of completed lessons, or null if none. */
  avgScore: number | null
  /** Last 7 days, oldest first: lessons completed, whether there was any activity, and whether a freeze covered it. */
  week: { day: number; lessons: number; active: boolean; frozen: boolean }[]
}

/** Day number of an IST calendar date ("2026-11-07"). */
export function dateDay(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
}

/**
 * A day counts towards the streak if the learner completed a lesson, asked the professor something, or earned
 * a study day in the XP ledger (`studyDays`, which also covers deleted courses and passed tests). A day covered by
 * a streak freeze (`frozenDays`) counts too. The current streak still stands if the last active day was yesterday.
 */
export function learningStats(
  lessons: StatsLesson[],
  questionTimes: string[],
  now = Date.now(),
  extra: { studyDays?: string[]; frozenDays?: string[] } = {},
): LearningStats {
  const today = istDay(now)
  const done = lessons.filter((l) => l.completed_at)
  const lessonsByDay = new Map<number, number>()
  for (const l of done) {
    const d = istDay(l.completed_at!)
    lessonsByDay.set(d, (lessonsByDay.get(d) ?? 0) + 1)
  }
  const active = new Set<number>(lessonsByDay.keys())
  for (const t of questionTimes) active.add(istDay(t))
  for (const d of extra.studyDays ?? []) active.add(dateDay(d))
  const frozen = new Set((extra.frozenDays ?? []).map(dateDay))
  for (const d of frozen) active.add(d)

  let streak = 0
  for (let d = active.has(today) ? today : today - 1; active.has(d); d--) streak++

  let bestStreak = 0
  let run = 0
  let prev: number | null = null
  for (const d of [...active].sort((a, b) => a - b)) {
    run = prev !== null && d === prev + 1 ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    prev = d
  }

  const scores = done.map((l) => l.best_score).filter((s): s is number => typeof s === "number")
  return {
    streak,
    bestStreak,
    activeToday: active.has(today),
    lessonsDone: done.length,
    minutes: done.reduce((sum, l) => sum + (l.est_minutes ?? 30), 0),
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    week: Array.from({ length: 7 }, (_, i) => {
      const day = today - 6 + i
      return { day, lessons: lessonsByDay.get(day) ?? 0, active: active.has(day), frozen: frozen.has(day) }
    }),
  }
}

/** Short weekday name of an IST day number ("Mon"). */
export function weekdayName(day: number) {
  return new Date(day * DAY_MS).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })
}
