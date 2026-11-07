// XP levels (5.7). Points are awarded in the database (migration 026); this only turns a total into a level.
// Level L starts at 25·L·(L−1) XP: 0, 50, 150, 300, 500, 750, … so each level needs 50 more than the last.

export const XP_RULES = [
  { label: "Pass a lesson", points: 10 },
  { label: "Score 100% on a lesson quiz", points: 5 },
  { label: "Pass a module test", points: 25 },
  { label: "Pass a final exam", points: 50 },
  { label: "Study on a new day", points: 5 },
] as const

const levelStart = (level: number) => 25 * level * (level - 1)

export type XpLevel = { level: number; total: number; into: number; span: number; toNext: number }

export function xpLevel(total: number): XpLevel {
  const xp = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2))
  while (levelStart(level + 1) <= xp) level++
  while (level > 1 && levelStart(level) > xp) level--
  const span = levelStart(level + 1) - levelStart(level)
  const into = xp - levelStart(level)
  return { level, total: xp, into, span, toNext: span - into }
}
