import { OG_SIZE, ogCard } from "@/lib/og"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "Krpex closed beta: Pro free for 30 days"

// The card WhatsApp, LinkedIn and others show for krpex.in/beta links.
export default function Image() {
  return ogCard({
    kicker: "Closed beta · Limited spots",
    title: "Help build Krpex. Pro free for 30 days.",
    subtitle: "Personal courses taught by an AI professor, 150 coding problems with an AI coach, and a learner community.",
  })
}
