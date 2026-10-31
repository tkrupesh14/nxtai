// Display labels for onboarding answers (no zod import, so client bundles stay small).

export const LEVEL_LABELS: Record<"new" | "some" | "comfortable" | "advanced", string> = {
  new: "Completely new to it",
  some: "Know the basics",
  comfortable: "Comfortable, want to go deeper",
  advanced: "Advanced, want to master it",
}
export const STYLE_LABELS: Record<"reading" | "examples" | "projects" | "mixed", string> = {
  reading: "Clear explanations",
  examples: "Lots of worked examples",
  projects: "Hands-on projects",
  mixed: "A mix of everything",
}
export const TIMELINE_LABELS: Record<"2_weeks" | "1_month" | "3_months" | "no_rush", string> = {
  "2_weeks": "In about 2 weeks",
  "1_month": "Within a month",
  "3_months": "Within 3 months",
  no_rush: "No rush",
}
