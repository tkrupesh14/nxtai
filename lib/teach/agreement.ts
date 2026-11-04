// The contributor agreement professors accept when they join (tracker 8.0).
// DRAFT: written as a starting point, not legal advice. It must be reviewed by a lawyer before real professors
// are invited. Change AGREEMENT_VERSION whenever the wording changes; each professor's accepted version is stored.

export const AGREEMENT_VERSION = "draft-2026-11-04"
export const AGREEMENT_IS_DRAFT = true

export const AGREEMENT: { heading: string; body: string }[] = [
  {
    heading: "What you're joining",
    body: "You're volunteering to help Krpex's AI teach better. You share teaching material, a description of how you teach, and corrections to lessons the AI writes. There is no payment for now.",
  },
  {
    heading: "Your named AI professor",
    body: "With your permission, Krpex shows an AI professor based on your teaching, for example \"Prof. Rao (AI)\". It is always labelled as AI, never presented as you personally, and says it is based on your material. You can see your public profile before it goes live.",
  },
  {
    heading: "Permission to use your material",
    body: "You keep ownership of everything you share. You give Krpex a non-exclusive, royalty-free licence to store it and use it to write lessons, quizzes, tests and answers for learners, and to show your name, photo, title and bio with your AI professor.",
  },
  {
    heading: "Only share what you may share",
    body: "Upload only material you wrote yourself or have the right to share. Don't upload textbooks, papers or slides owned by someone else unless you have permission. We may remove material that looks like it breaks this rule.",
  },
  {
    heading: "Leaving and removing material",
    body: "You can remove any item at any time, and it stops being used straight away. You can also ask us to close your professor account; we then stop showing your AI professor and delete your material. Lessons already written for learners may keep text that was based on it.",
  },
  {
    heading: "Quality and safety",
    body: "Your material and corrections are reviewed by Krpex before learners see them. Krpex may edit, decline or stop using any contribution, and may suspend a professor account.",
  },
  {
    heading: "Your data",
    body: "We store your profile, your account email and what you upload as described in our Privacy Policy. We keep only the text of uploaded files, never the files themselves.",
  },
]
