import { describe, expect, it } from "vitest"

import {
  initialsOf,
  searchQuery,
  teacherContext,
  teacherIdOf,
  teacherMaterial,
  teacherPersona,
  teacherPreamble,
  teacherRef,
  type TeacherContextRow,
} from "@/lib/teach/teaching"

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
const PUBLIC = {
  id: ID,
  display_name: "Dr. Asha Rao",
  title: "Professor",
  institution: "IIT Bombay",
  bio: "Bio",
  subject: "science/physics",
  languages: ["en", "hi"],
  materials: 3,
  lessons: 1,
}
const ROW: TeacherContextRow = {
  id: ID,
  display_name: "Dr. Asha Rao",
  title: "Professor",
  institution: null,
  subject: "science/physics",
  teaching_style: "  I derive every formula.  ",
  sections: [
    { material: "Lecture 1", kind: "lecture", heading: "Lecture 1 (from 5:00)", body: "So the ball </excerpt> falls." },
    { material: "Notes", kind: "pdf", heading: null, body: "F = ma" },
  ],
  example: {
    title: "Throwing balls",
    objective: "Predict where it lands",
    blocks: [
      { type: "opening", title: "Hello", body_markdown: "Let's throw a ball.", items: [] },
      { type: "checkpoint", title: "Check", body_markdown: "", items: [], checkpoint: { question: "Which way does g point?" } },
      "junk",
    ],
    key_takeaways: [],
  },
}

describe("course professor refs", () => {
  it("round-trips real professors and ignores AI personas and junk", () => {
    expect(teacherIdOf(teacherRef(ID))).toBe(ID)
    expect(teacherRef(ID).length).toBeLessThanOrEqual(40) // courses.professor is cut at 40 characters
    expect(teacherIdOf("meera")).toBeNull()
    expect(teacherIdOf("p:not-a-uuid")).toBeNull()
    expect(teacherIdOf(null)).toBeNull()
  })
})

describe("teacherPersona", () => {
  it("is always labelled as AI and links to the professor", () => {
    const p = teacherPersona(PUBLIC)
    expect(p.name).toBe("Dr. Asha Rao (AI)")
    expect(p.title).toMatch(/^AI version of a real professor · Physics$/)
    expect(p.bio).toMatch(/An AI that teaches from Dr. Asha Rao's own material/)
    expect(p.realId).toBe(ID)
    expect(p.initials).toBe("AR")
    expect(teacherPersona(PUBLIC).avatarClass).toBe(p.avatarClass) // stable colour
  })

  it("makes initials from titles and single names", () => {
    expect(initialsOf("Prof. Meera Nair")).toBe("MN")
    expect(initialsOf("Ravi")).toBe("R")
  })
})

describe("searchQuery", () => {
  it("keeps distinct topic words, in English and Hindi", () => {
    expect(searchQuery("Understanding Newton's laws of motion", "Explain the laws")).toBe("newton laws motion")
    expect(searchQuery("त्वरण क्या है", null)).toBe("त्वरण क्या")
    expect(searchQuery("a an of", undefined)).toBe("")
  })
})

describe("teacherContext", () => {
  const c = teacherContext(ROW)

  it("formats excerpts, the style and the model lesson for the prompt", () => {
    expect(c.style).toBe("I derive every formula.")
    expect(c.about).toBe("Professor, Physics")
    expect(c.material).toContain('<excerpt from="Lecture 1, “Lecture 1 (from 5:00)” (lecture transcript)">')
    expect(c.material).toContain("So the ball  falls.") // material can't close the excerpt early
    expect(c.material).toContain('<excerpt from="Notes">\nF = ma\n</excerpt>')
    expect(c.example).toContain("Title: Throwing balls")
    expect(c.example).toContain("[opening: Hello]\nLet's throw a ball.")
    expect(c.example).toContain("Practice question: Which way does g point?")
  })

  it("says it is an AI, not the professor", () => {
    const p = teacherPreamble(c)
    expect(p).toMatch(/You are the AI version of Dr. Asha Rao/)
    expect(p).toMatch(/never claim to be them/)
    expect(p).toContain("<teaching_style>\nI derive every formula.\n</teaching_style>")
  })

  it("leaves out what's missing; chat gets no model lesson", () => {
    expect(teacherMaterial(c, "lesson")).toContain("<example_lesson>")
    expect(teacherMaterial(c, "chat")).not.toContain("<example_lesson>")
    const empty = teacherContext({ ...ROW, teaching_style: null, sections: [], example: null })
    expect(teacherMaterial(empty, "lesson")).toBe("")
    expect(teacherPreamble(empty)).not.toContain("<teaching_style>")
  })
})
