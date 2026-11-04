import { describe, expect, it } from "vitest"

import { chunksFromSarvam, clock, mediaType, transcriptSections, transcriptText } from "@/lib/teach/recordings"

describe("recordings", () => {
  it("knows which files it can send", () => {
    expect(mediaType("Lecture 2.MP3")).toBe("audio/mpeg")
    expect(mediaType("class.mp4")).toBe("audio/mp4")
    expect(mediaType("notes.pdf")).toBeNull()
  })

  it("turns Sarvam's timestamps into paragraphs of about a minute", () => {
    const { chunks } = chunksFromSarvam({
      transcript: "a b c",
      timestamps: { words: ["First idea.", "Still first.", "Second minute."], start_time_seconds: [0, 30, 75], end_time_seconds: [20, 62, 80] },
    })
    expect(transcriptText(chunks)).toBe("[0:00] First idea. Still first.\n\n[1:15] Second minute.")
    expect(transcriptText([], "plain")).toBe("plain")
    expect(clock(3725)).toBe("1:02:05")
  })

  it("splits the transcript into sections of about 5 minutes, keeping the time", () => {
    const text = Array.from({ length: 12 }, (_, i) => `[${i}:00] Minute ${i}.`).join("\n\n")
    const sections = transcriptSections(text, "Newton's laws")
    expect(sections.map((s) => s.heading)).toEqual(["Newton's laws (from 0:00)", "Newton's laws (from 5:00)", "Newton's laws (from 10:00)"])
    expect(sections[0].body).toBe("Minute 0.\n\nMinute 1.\n\nMinute 2.\n\nMinute 3.\n\nMinute 4.")
    expect(transcriptSections("No times here.", "T")).toEqual([{ heading: "T", page_from: null, page_to: null, body: "No times here." }])
    expect(transcriptSections("x".repeat(20000), "Long").every((s) => s.body.length <= 7500)).toBe(true)
  })
})
