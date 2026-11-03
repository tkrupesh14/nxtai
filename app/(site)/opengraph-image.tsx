import { OG_SIZE, ogCard } from "@/lib/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "Krpex: your personal AI professor"

export default function Image() {
  return ogCard({
    kicker: "Learn anything, your way",
    title: "Your personal AI professor",
    subtitle: "A course built around your goal: class-style lessons, quizzes, tests and answers to your questions.",
  })
}
