// Community 5c: the boards in lib/community/boards.ts match the community_boards rows in migration 035.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { BOARDS, boardSpace, getBoard, spaceBoard } from "@/lib/community/boards"
import { postPath } from "@/lib/community/posts"

const sql = readFileSync(join(__dirname, "../../supabase/migrations/20261121000035_community_boards.sql"), "utf8")

describe("community boards", () => {
  it("match the migration's rows (slug, kind, title) in order", () => {
    const rows = Array.from(sql.matchAll(/\('([a-z0-9-]+)', '(general|course)', '([^']+)', \d+\)/g), (m) => ({ slug: m[1], kind: m[2], title: m[3] }))
    expect(rows).toEqual(BOARDS.map((b) => ({ slug: b.slug, kind: b.kind, title: b.title })))
  })

  it("map spaces and post paths", () => {
    expect(boardSpace("it-cloud")).toBe("board:it-cloud")
    expect(spaceBoard("board:it-cloud")).toBe("it-cloud")
    expect(spaceBoard("code:p:two-sum")).toBeNull()
    expect(getBoard("science")?.kind).toBe("course")
    expect(getBoard("nope")).toBeNull()
    expect(postPath("board:help", "discussion", "abc")).toBe("/c/help/abc")
    expect(postPath("code:p:two-sum", "solution", "abc")).toBe("/p/two-sum/solutions/abc")
    expect(postPath("code:p:two-sum", "discussion", "abc")).toBe("/p/two-sum/discuss/abc")
  })
})
