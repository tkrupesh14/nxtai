// Turns lesson blocks into plain text for the browser's speech engine ("Listen" in a lesson).
// Code, tables and long equations are not read symbol by symbol; the learner is pointed at the screen instead.

import type { Diagram, LessonBlock } from "@/lib/learning/schemas"

/** Short TeX read aloud ("x^2 + 1 = 5" → "x squared plus 1 equals 5"); anything complex becomes a pointer to the screen. */
export function speakMath(tex: string) {
  let s = tex.trim()
  for (let i = 0; i < 3; i++) s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, " $1 over $2 ")
  s = s
    .replace(/\\sqrt\{([^{}]*)\}/g, " the square root of $1 ")
    .replace(/\^\{?2\}?/g, " squared ")
    .replace(/\^\{?3\}?/g, " cubed ")
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, " to the power $1$2 ")
    .replace(/_\{([^{}]*)\}|_(\w)/g, " $1$2 ")
    .replace(/\\(times|cdot)/g, " times ")
    .replace(/\\div/g, " divided by ")
    .replace(/\\pm/g, " plus or minus ")
    .replace(/\\(leq?|le)\b/g, " is at most ")
    .replace(/\\(geq?|ge)\b/g, " is at least ")
    .replace(/\\neq?\b/g, " is not equal to ")
    .replace(/\\approx/g, " is about ")
    .replace(/\\pi\b/g, " pi ")
    .replace(/\\(alpha|beta|gamma|delta|theta|lambda|mu|sigma|omega)\b/g, " $1 ")
    .replace(/\\(left|right|,|;|!|quad|qquad)/g, " ")
    .replace(/\\text\{([^{}]*)\}/g, " $1 ")
    .replace(/<=/g, " is at most ")
    .replace(/>=/g, " is at least ")
    .replace(/=/g, " equals ")
    .replace(/\+/g, " plus ")
    .replace(/(^|[\s(])-(?=\s*[\w(])/g, "$1 minus ")
    .replace(/\s-\s/g, " minus ")
    .replace(/</g, " is less than ")
    .replace(/>/g, " is greater than ")
    .replace(/\//g, " over ")
    .replace(/\*/g, " times ")
    .replace(/[{}]/g, " ")
  if (/\\[a-zA-Z]/.test(s) || s.length > 120) return "the equation on screen"
  return s.replace(/\s+/g, " ").trim()
}

/** Markdown → speakable text. */
export function speakMarkdown(md: string) {
  return (
    md
      // Fenced code: point at it instead of reading it.
      .replace(/```[\s\S]*?(```|$)/g, "\n(There's a code example on screen.)\n")
      // Tables: skip rows, mention once.
      .replace(/(^\|.*\|[ \t]*\n?)+/gm, "\n(See the table on screen.)\n")
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => ` ${speakMath(tex)} `)
      .replace(/^\s*([-*_]\s*){3,}$/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*([-*+]|\d+[.)])\s+/gm, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/<\/?[a-zA-Z][^<>]*>/g, "")
      .replace(/https?:\/\/\S+/g, "the link on screen")
      // Each line ends as a sentence so the voice pauses between list items.
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((l) => l.replace(/\s+([.,!?;:])/g, "$1"))
      .map((l) => (/[.!?:;)]$/.test(l) ? l : `${l}.`))
      .join(" ")
  )
}

function speakDiagram(d: Diagram) {
  if (d.kind === "comparison") {
    return [
      `This diagram compares ${d.columns.join(" and ")}.`,
      ...d.rows.map((r) => `${r.label}: ${r.cells.map((c, i) => `${d.columns[i] ?? ""}, ${c}`).join("; ")}.`),
    ].join(" ")
  }
  const intro = { flow: "Here are the steps.", cycle: "This cycle goes round like this.", hierarchy: "Here is how it breaks down.", timeline: "Here is the timeline." }[d.kind]
  return [intro, ...d.items.map((it) => `${it.label}${it.detail ? `: ${it.detail}` : ""}.`)].join(" ")
}

const OPTION_LETTERS = "ABCDEFGH"

/** What the professor says for one block. The checkpoint answer is never read out. */
export function speakBlock(block: LessonBlock) {
  const parts: string[] = []
  if (block.title) parts.push(`${block.title.replace(/[.:]$/, "")}.`)
  if (block.body_markdown) parts.push(speakMarkdown(block.body_markdown))
  if (block.items.length) parts.push(block.items.map((i) => speakMarkdown(i)).join(" "))
  if (block.diagram) parts.push(speakDiagram(block.diagram))
  if (block.checkpoint) {
    parts.push(
      `Pause and think. ${speakMarkdown(block.checkpoint.question)}`,
      ...block.checkpoint.options.map((o, i) => `${OPTION_LETTERS[i]}: ${speakMarkdown(o)}`),
      "Choose your answer on screen.",
    )
  }
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").replace(/\.\./g, ".").trim()
}

/**
 * Split text into pieces of at most `max` characters, on sentence boundaries where possible.
 * Browsers cut off or stall on long utterances (Chrome stops after ~15 s), so each piece is spoken separately.
 */
export function chunkSpeech(text: string, max = 220) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? []
  const chunks: string[] = []
  let cur = ""
  const push = () => {
    if (cur.trim()) chunks.push(cur.trim())
    cur = ""
  }
  for (const s of sentences) {
    if (s.length > max) {
      push()
      // Long sentence: break on commas, then on spaces.
      let rest = s.trim()
      while (rest.length > max) {
        const cut = Math.max(rest.lastIndexOf(", ", max), rest.lastIndexOf(" ", max))
        const at = cut > max / 3 ? cut + 1 : max
        chunks.push(rest.slice(0, at).trim())
        rest = rest.slice(at).trim()
      }
      cur = rest ? `${rest} ` : ""
    } else if ((cur + s).length > max) {
      push()
      cur = s
    } else cur += s
  }
  push()
  return chunks
}

/** Speech pieces for a lecture section (a group of blocks). */
export function sectionSpeech(blocks: LessonBlock[]) {
  return chunkSpeech(blocks.map(speakBlock).filter(Boolean).join(" "))
}
