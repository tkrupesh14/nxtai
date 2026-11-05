/**
 * Tidy the maths in AI-written Markdown before remark-math reads it. Pure, unit tested.
 *
 * remark-math only treats $$ as a displayed equation when each $$ sits on its own line; otherwise text after an
 * opening "$$" is dropped as a label and the equation swallows the rest of the block (shown as red LaTeX).
 * Here every $$…$$ pair is found wherever it starts: multi-line or environment maths (\begin{aligned}…) becomes a
 * displayed equation on its own lines, the rest stays inline. \[…\], \(…\) and bare \begin{…}…\end{…} are
 * converted too. Code (``` fences and `inline`) is left alone.
 */

const ENV = /\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g

function display(tex: string) {
  return `\n\n$$\n${tex.trim()}\n$$\n\n`
}

function tidyText(text: string): string {
  // \[ … \] and \( … \) are LaTeX's own delimiters.
  let out = text
    // (Not "\\[4pt]", a line break with spacing inside an equation.)
    .replace(/(^|[^\\])\\\[([\s\S]+?[^\\])\\\]/g, (_, pre: string, tex: string) => pre + display(tex))
    .replace(/(^|[^\\])\\\(([\s\S]+?[^\\])\\\)/g, (_, pre: string, tex: string) => `${pre}$$${tex}$$`)

  // Pair up $$ … $$ from left to right.
  const parts = out.split("$$")
  if (parts.length < 3) {
    // No complete pair: wrap bare environments, and drop a lone $$ so it can't swallow the text after it.
    return parts.length === 2 ? wrapEnvs(parts.join("")) : wrapEnvs(out)
  }
  out = ""
  for (let i = 0; i < parts.length; i++) {
    const isMath = i % 2 === 1 && i < parts.length - 1
    if (!isMath) {
      // An unmatched trailing $$ (odd count) is dropped for the same reason.
      out += wrapEnvs(parts[i])
      continue
    }
    const tex = parts[i]
    if (!tex.trim()) continue
    // A pair alone on its line is a displayed equation too (as before).
    const ownLine = /(^|\n)[ \t]*$/.test(out) && /^[ \t]*(\n|$)/.test(parts[i + 1])
    out += ownLine || /\n|\\begin\{|\\\\/.test(tex) ? display(tex) : `$$${tex.trim()}$$`
  }
  return out.replace(/\n{3,}/g, "\n\n")
}

/** \begin{aligned}…\end{aligned} written without any $$ around it. */
function wrapEnvs(text: string) {
  return text.replace(ENV, (env) => display(env))
}

export function tidyMath(md: string): string {
  if (!/\$\$|\\\[|\\\(|\\begin\{/.test(md)) return md
  // Keep fenced code blocks and inline code exactly as written.
  const pieces = md.split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
  return pieces.map((p, i) => (i % 2 === 1 ? p : tidyText(p))).join("").trim()
}

// Spaces Markdown doesn't count as a space after a list marker (non-breaking, en/em, thin, narrow, zero-width).
const ODD_SPACE = "[\\u00a0\\u2000-\\u200b\\u202f\\u3000]"
const BULLET_LINE = new RegExp(`^([ \\t]*)(?:\\\\?([*+-])|[•·▪◦‣●○])(?:[ \\t]|${ODD_SPACE})+`)
const NUMBER_LINE = new RegExp(`^([ \\t]*)(\\d{1,3})\\\\?([.)])${ODD_SPACE}+`)

/**
 * Make AI-written lists render as lists. Models sometimes write "*" plus a non-breaking space, an escaped "\*",
 * or "•" characters, which Markdown shows as plain text with a stray "*". Code is left exactly as written.
 */
export function tidyLists(md: string): string {
  if (!/[*+\-•·▪◦‣●○]|\d[.)]/.test(md)) return md
  let fenced = false
  return md
    .split("\n")
    .map((line) => {
      if (/^[ \t]*(```|~~~)/.test(line)) fenced = !fenced
      if (fenced) return line
      const b = BULLET_LINE.exec(line)
      if (b) return `${b[1]}${b[2] === "+" || b[2] === "-" ? b[2] : "*"} ${line.slice(b[0].length)}`
      const n = NUMBER_LINE.exec(line)
      if (n) return `${n[1]}${n[2]}${n[3]} ${line.slice(n[0].length)}`
      return line
    })
    .join("\n")
}

/** Everything the lesson Markdown renderer does to AI text before parsing it. */
export function tidyMarkdown(md: string): string {
  return tidyMath(tidyLists(md))
}
