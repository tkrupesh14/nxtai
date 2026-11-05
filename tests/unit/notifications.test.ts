import { describe, expect, it } from "vitest"

import { mergeNotifications, safeLink, timeAgo, type Notification } from "@/lib/notifications"

const n = (id: string, at: string, extra: Partial<Notification> = {}): Notification => ({
  id, kind: "professor_reply", title: id, body: null, link: null, ref: null, read_at: null, created_at: at, ...extra,
})

describe("notifications", () => {
  it("follows only links on this site", () => {
    expect(safeLink("/teach#inbox")).toBe("/teach#inbox")
    expect(safeLink("/learn/a/b?ask=1")).toBe("/learn/a/b?ask=1")
    for (const bad of ["//evil.example", "https://evil.example", "javascript:alert(1)", "/", "", null]) expect(safeLink(bad)).toBeNull()
  })

  it("puts new ones first and replaces an unread one about the same thing", () => {
    const list = [n("a", "2026-11-05T10:00:00Z", { ref: "f1" }), n("b", "2026-11-05T09:00:00Z")]
    const merged = mergeNotifications(list, [n("c", "2026-11-05T11:00:00Z", { ref: "f1" }), n("b", "2026-11-05T09:00:00Z")])
    expect(merged.map((x) => x.id)).toEqual(["c", "b"])
    const read = [n("a", "2026-11-05T10:00:00Z", { ref: "f1", read_at: "2026-11-05T10:01:00Z" })]
    expect(mergeNotifications(read, [n("c", "2026-11-05T11:00:00Z", { ref: "f1" })]).map((x) => x.id)).toEqual(["c", "a"])
  })

  it("says how long ago", () => {
    const now = Date.parse("2026-11-05T12:00:00Z")
    expect(timeAgo("2026-11-05T11:59:30Z", now)).toBe("just now")
    expect(timeAgo("2026-11-05T11:55:00Z", now)).toBe("5 min ago")
    expect(timeAgo("2026-11-05T09:00:00Z", now)).toBe("3 h ago")
    expect(timeAgo("2026-11-04T09:00:00Z", now)).toBe("yesterday")
    expect(timeAgo("2026-11-01T09:00:00Z", now)).toBe("1 Nov")
  })
})
