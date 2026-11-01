import { diagramText } from "@/lib/learning/diagram"
import type { LessonBlock } from "@/lib/learning/schemas"

export type LessonSection = { blocks: { block: LessonBlock; index: number }[]; gated: boolean }

/** Group blocks into lecture sections: at most two blocks each, and a checkpoint always ends a section. */
export function toSections(blocks: LessonBlock[]) {
  const sections: LessonSection[] = []
  let current: LessonSection["blocks"] = []
  blocks.forEach((block, index) => {
    current.push({ block, index })
    if (block.type === "checkpoint" || current.length === 2) {
      sections.push({ blocks: current, gated: block.type === "checkpoint" })
      current = []
    }
  })
  if (current.length) sections.push({ blocks: current, gated: false })
  return sections
}

/** Plain-text version of a section, used as context for the professor. */
export function sectionText(section: LessonSection, maxChars = 2500) {
  const text = section.blocks
    .map(({ block }) =>
      [
        block.title ? `## ${block.title}` : "",
        block.body_markdown,
        ...block.items.map((i) => `- ${i}`),
        block.checkpoint ? `Practice question: ${block.checkpoint.question}` : "",
        block.diagram ? diagramText(block.diagram) : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n")
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}

/** Short title for a section in the UI ("Worked example: …"). */
export function sectionLabel(section: LessonSection) {
  const b = section.blocks.find(({ block }) => block.title)?.block ?? section.blocks[0].block
  return b.title || b.type.replace(/_/g, " ")
}
