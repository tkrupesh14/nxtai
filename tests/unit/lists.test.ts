import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { describe, expect, it } from "vitest"

import { tidyLists } from "@/lib/learning/math"

const render = (md: string) => renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], children: tidyLists(md) }))

describe("tidyLists", () => {
  it.each([
    ["non-breaking space after *", "Think of it like this:\n\n* Distance: total.\n\n* Displacement: shortest."],
    ["escaped \\*", "Think of it like this:\n\n\\* Distance: total.\n\\* Displacement: shortest."],
    ["• bullets", "Think of it like this:\n• Distance: total.\n• Displacement: shortest."],
    ["plain * (unchanged)", "Think of it like this:\n\n* Distance: total.\n* Displacement: shortest."],
  ])("renders a list: %s", (_, md) => {
    const html = render(md)
    expect(html).toContain("<ul>")
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).not.toMatch(/[*•] ?Distance/)
  })

  it("fixes numbered lists with a non-breaking space", () => {
    expect(render("Steps:\n\n1. Walk east.\n2. Turn left.")).toContain("<ol>")
  })

  it("leaves code, sums and emphasis alone", () => {
    const code = "```\n* not a list\n```"
    expect(tidyLists(code)).toBe(code)
    expect(tidyLists("Distance = 3 + 2 = 5 metres")).toBe("Distance = 3 + 2 = 5 metres")
    expect(tidyLists("*Displacement* has a direction")).toBe("*Displacement* has a direction")
    expect(tidyLists("Displacement = 3 – 2 = 1 metre")).toBe("Displacement = 3 – 2 = 1 metre")
  })
})
