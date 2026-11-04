// A stand-in for OpenRouter's Chat Completions API, used by the signed-in browser tests (and checked by a unit
// test against the real AI client). It answers each structured-output request by its schema name with fixed,
// valid content, so tests are fast, free and repeatable. Every question's right answer is "The right answer"
// (the first option as sent; the app may shuffle options).
//
//   node tests/support/fake-ai.mjs [port]     (default 3199; the app then needs AI_BASE_URL=http://127.0.0.1:3199/v1)

import { createServer } from "node:http"

const q = (question) => ({
  question,
  options: ["The right answer", "A wrong answer", "Another wrong answer", "Not this one"],
  answer_index: 0,
  explanation: "The first option is right in every fake question.",
})

const block = (type, title, body_markdown, extra = {}) => ({ type, title, body_markdown, items: [], checkpoint: null, diagram: null, ...extra })

export function fakeLesson(title = "Today's lesson", sourceRef = null) {
  return {
    blocks: [
      block(
        "opening",
        "Welcome",
        `Welcome to **${title}**. This is a test lesson written by the fake AI.${sourceRef ? ` Taught from your material (${sourceRef}).` : ""}`,
      ),
      block("objectives", "By the end you can", "", { items: ["Explain the idea", "Use it in a small example"] }),
      block("explanation", "The idea", "Here is the main idea, with some `inline code` and a formula $$x^2 + 1 = 5$$."),
      block("checkpoint", "Pause and think", "Think about what we just covered.", { checkpoint: q("Which option is right?") }),
      block("worked_example", "A worked example", "Step one, then step two:\n\n```python\nprint('hello')\n```"),
      block("diagram", "How it flows", "Here is the process.", {
        diagram: {
          kind: "flow",
          items: [
            { label: "Start", detail: "Begin here", parent: null },
            { label: "Practice", detail: "", parent: null },
            { label: "Finish", detail: "Done", parent: null },
          ],
          columns: [],
          rows: [],
        },
      }),
      block("common_mistakes", "Common mistakes", "", { items: ["Rushing", "Skipping practice"] }),
      block("summary", "Summary", "That's the lesson.", { items: ["The idea", "The example"] }),
    ],
    key_takeaways: ["Fake takeaway one", "Fake takeaway two", "Fake takeaway three"],
    quiz: [q("Question one?"), q("Question two?"), q("Question three?"), q("Question four?")],
  }
}

export const FAKE_PLAN = {
  welcome_message: "Welcome! I'm your AI professor and this is a test course from the fake AI.",
  title: "Test Course From Fake AI",
  summary: "A short course used by the automated tests.",
  level: "beginner",
  estimated_weeks: 2,
  modules: [
    {
      title: "Getting started",
      summary: "The basics.",
      lessons: [
        { title: "First steps", objective: "Explain the first idea.", est_minutes: 20 },
        { title: "Second steps", objective: "Use the first idea.", est_minutes: 25 },
      ],
    },
    {
      title: "Going further",
      summary: "Applying it.",
      lessons: [{ title: "A small project", objective: "Build something small.", est_minutes: 30 }],
    },
  ],
}

function contentFor(name, prompt) {
  switch (name) {
    case "goal_check":
      return { verdict: "ok", message: "", better_category: "" }
    case "course_plan":
      return FAKE_PLAN
    case "source_course_plan": {
      // One lesson per section (at most 4), so tests can follow a section into its lesson.
      const n = Number(/S numbers \(1-(\d+)\)/.exec(prompt)?.[1] ?? 1)
      const lessons = Array.from({ length: Math.min(n, 4) }, (_, i) => ({
        title: `From your material ${i + 1}`,
        objective: `Learn section S${i + 1}.`,
        est_minutes: 20,
        sections: [i + 1],
      }))
      return { ...FAKE_PLAN, title: "Course from your material", modules: [{ title: "Your material", summary: "From your file.", lessons }] }
    }
    case "lesson":
      return fakeLesson(/Today's lesson: "([^"]+)"/.exec(prompt)?.[1], /<section ref="([^"]+)">/.exec(prompt)?.[1] ?? null)
    case "module_test":
    case "final_exam": {
      const count = Number(/Exactly (\d+) multiple-choice/.exec(prompt)?.[1] ?? 8)
      const label = name === "module_test" ? "Module test" : "Final exam"
      return { questions: Array.from({ length: count }, (_, i) => q(`${label} question ${i + 1}?`)) }
    }
    case "professor_reply": {
      const question = /<question>([\s\S]*?)<\/question>/.exec(prompt)?.[1]?.trim() ?? ""
      // "GIVE-AWAY" questions answer like a careless model would, unless the prompt asks for hints only.
      if (/GIVE-AWAY/.test(question) && !/hints only/.test(prompt)) {
        return { verdict: "answer", graded_question: true, reply: "The correct answer is B." }
      }
      return { verdict: "answer", graded_question: false, reply: `Fake professor answer to: ${question}` }
    }
    default:
      return null
  }
}

const usage = { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }

/** Requests received, newest last (for tests that check what the app asked for). */
export const received = []

export function startFakeAi(port = 3199) {
  const server = createServer((req, res) => {
    if (req.method === "GET") {
      res.writeHead(200, { "content-type": "text/plain" })
      return res.end("fake ai ok")
    }
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", async () => {
      let body
      try {
        body = JSON.parse(raw)
      } catch {
        res.writeHead(400)
        return res.end("bad json")
      }
      const name = body.response_format?.json_schema?.name
      const prompt = String(body.messages?.at(-1)?.content ?? "") // the user message (the system prompt mentions <question> too)
      received.push({ name, stream: Boolean(body.stream) })
      const content = req.url?.endsWith("/chat/completions") ? contentFor(name, prompt) : null
      if (!content) {
        res.writeHead(404, { "content-type": "application/json" })
        return res.end(JSON.stringify({ error: { message: `fake ai: unknown request ${req.url} ${name}` } }))
      }
      const text = JSON.stringify(content)
      const base = { id: `fake-${Date.now()}`, created: Math.floor(Date.now() / 1000), model: body.model ?? "fake" }

      if (!body.stream) {
        res.writeHead(200, { "content-type": "application/json" })
        return res.end(
          JSON.stringify({
            ...base,
            object: "chat.completion",
            choices: [{ index: 0, message: { role: "assistant", content: text, refusal: null }, finish_reason: "stop", logprobs: null }],
            usage,
          }),
        )
      }

      // Streamed: send the JSON in pieces so the page shows blocks while they "arrive".
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" })
      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)
      const pieces = 12
      const size = Math.ceil(text.length / pieces)
      for (let i = 0; i < text.length; i += size) {
        send({
          ...base,
          object: "chat.completion.chunk",
          choices: [{ index: 0, delta: i === 0 ? { role: "assistant", content: text.slice(i, i + size) } : { content: text.slice(i, i + size) }, finish_reason: null, logprobs: null }],
        })
        await new Promise((r) => setTimeout(r, 40))
      }
      send({ ...base, object: "chat.completion.chunk", choices: [{ index: 0, delta: {}, finish_reason: "stop", logprobs: null }], usage })
      res.write("data: [DONE]\n\n")
      res.end()
    })
  })
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 3199)
  await startFakeAi(port)
  console.log(`fake AI listening on http://127.0.0.1:${port}/v1`)
}
