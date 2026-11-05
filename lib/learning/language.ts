/**
 * The language a course is taught in (8.3). Lessons, quizzes, tests, chat and the course plan are written in it;
 * the site's own buttons and menus stay English. Pure and client-safe.
 */
export const COURSE_LANGUAGES = [
  { id: "en", name: "English", native: "English" },
  { id: "hi", name: "Hindi", native: "हिन्दी" },
] as const
export type CourseLanguage = (typeof COURSE_LANGUAGES)[number]["id"]

export const isCourseLanguage = (v: unknown): v is CourseLanguage => v === "en" || v === "hi"
export const courseLanguage = (v: unknown): CourseLanguage => (v === "hi" ? "hi" : "en")

const HINDI_STYLE = `in Hindi, in Devanagari script, the way a good teacher speaks in a Hindi-medium classroom in India:
simple, natural Hindi, not literary or machine-translated. Keep standard technical terms recognisable: give the English
term in brackets the first time, e.g. त्वरण (acceleration), and keep words Indian students normally say in English
(software, computer, current, voltage) in English. Formulas, units, symbols and code stay as usual (F = ma, m/s², print()).`

/** The language instruction for a prompt; "" for English (the default the prompts are written for). */
export function languageRule(language: CourseLanguage | null | undefined, use: "plan" | "lesson" | "test" | "chat"): string {
  if (language !== "hi") return ""
  const what = {
    plan: "the course title, summary, module and lesson titles, objectives and the welcome message",
    lesson: "the whole lesson: every block, the takeaways, the checkpoints and the quiz",
    test: "every question, option and explanation",
    chat: "your answer",
  }[use]
  const extra =
    use === "chat"
      ? "\nIf the learner writes in English, answer in English; if they write in Hinglish (Hindi in Latin letters), answer in Hindi in Devanagari."
      : use === "lesson" || use === "test"
        ? "\nLearner material and professor material may be in English: teach from it, but write in Hindi."
        : ""
  return `\n<language>\nThis course is taught in Hindi. Write ${what} ${HINDI_STYLE}${extra}\n</language>\n`
}
