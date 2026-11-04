// Subjects open to professors. Pilot: Physics (Science → Physics), taught in English and Hindi.
export const TEACH_SUBJECTS = [{ id: "science/physics", name: "Physics" }] as const
export const TEACH_LANGUAGES = [
  { id: "en", name: "English" },
  { id: "hi", name: "हिन्दी (Hindi)" },
] as const
export type TeachLanguage = (typeof TEACH_LANGUAGES)[number]["id"]

export const subjectName = (id: string) => TEACH_SUBJECTS.find((s) => s.id === id)?.name ?? id
export const languageName = (id: string) => TEACH_LANGUAGES.find((l) => l.id === id)?.name ?? id
export const isTeachLanguage = (id: unknown): id is TeachLanguage => TEACH_LANGUAGES.some((l) => l.id === id)
