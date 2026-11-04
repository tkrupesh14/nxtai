import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import { describe, expect, it } from "vitest"

import { tidyMath } from "@/lib/learning/math"

const render = (md: string) =>
  renderToStaticMarkup(
    createElement(ReactMarkdown, {
      remarkPlugins: [[remarkMath, { singleDollarTextMath: false }]],
      rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: "ignore" }]],
      children: tidyMath(md),
    }),
  )

// The worked example from the B2 bug report (2026-11-04).
const REPORTED = String.raw`Let's prove $$A\cap(B\cup C)=(A\cap B)\cup(A\cap C)$$. I'll take an arbitrary object $$x$$ and translate each operation in order:
$$\begin{aligned} x\in A\cap(B\cup C) &\iff (x\in A)\land(x\in B\cup C) &&\text{intersection definition}\\ &\iff (x\in A)\land\big((x\in B)\lor(x\in C)\big) &&\text{union definition}\\ &\iff \big((x\in A)\land(x\in B)\big)\lor\big((x\in A)\land(x\in C)\big) &&\text{distributive law of logic}\\ &\iff x\in(A\cap B)\cup(A\cap C) &&\text{set-operation definitions.} \end{aligned}$$ Because this equivalence holds for every $$x$$, the two sets have the same members, so they are equal. To check your intuition, let $$A=\{1,2\}$$, $$B=\{2,3\}$$, and $$C=\{1,4\}$$. Both sides give $$\{1,2\}$$.`

describe("tidyMath", () => {
  it("renders the reported multi-line proof without errors", () => {
    const html = render(REPORTED)
    expect(html).not.toContain("katex-error")
    expect(html).toContain("katex-display")
    expect(html).not.toContain("$$")
    expect(html).toContain("Because this equivalence holds for every")
  })

  it("puts environments and multi-line maths on their own lines", () => {
    expect(tidyMath(String.raw`Steps: $$\begin{aligned}a&=b\\&=c\end{aligned}$$ done.`)).toBe(
      String.raw`Steps: ` + "\n\n$$\n" + String.raw`\begin{aligned}a&=b\\&=c\end{aligned}` + "\n$$\n\n" + " done.",
    )
    const html = render("Then\n$$\na = b\n+ c\n$$\nand more")
    expect(html).toContain("katex-display")
    expect(html).not.toContain("katex-error")
  })

  it("keeps inline maths inline and a lone line as a displayed equation", () => {
    expect(tidyMath("Area is $$\\pi r^2$$ here.")).toBe("Area is $$\\pi r^2$$ here.")
    expect(render("Area:\n\n$$\\pi r^2$$\n\nok")).toContain("katex-display")
  })

  it("converts \\[ \\] and \\( \\), and wraps bare environments", () => {
    expect(render(String.raw`Inline \(x^2\) and \[\frac{a}{b}\]`)).not.toContain("katex-error")
    expect(render(String.raw`Inline \(x^2\) and \[\frac{a}{b}\]`)).toContain("katex-display")
    const bare = render(String.raw`So \begin{aligned}a&=1\\b&=2\end{aligned} works`)
    expect(bare).toContain("katex-display")
    expect(bare).not.toContain("katex-error")
  })

  it("doesn't read a row break with spacing as \\[", () => {
    const html = render(String.raw`$$\begin{aligned}a&=1\\[4pt]b&=2\end{aligned}$$`)
    expect(html).not.toContain("katex-error")
  })

  it("drops a lone $$ instead of letting it swallow the text", () => {
    expect(tidyMath("Costs $$5 and more text")).toBe("Costs 5 and more text")
  })

  it("leaves code alone and text without maths untouched", () => {
    const code = "Use `$$x$$` literally:\n```\nprint('$$\\\\[')\n```"
    expect(tidyMath(code)).toBe(code)
    expect(tidyMath("Plain *text* with $5.")).toBe("Plain *text* with $5.")
  })
})
