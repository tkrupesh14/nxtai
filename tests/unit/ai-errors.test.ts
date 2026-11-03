import OpenAI from "openai"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AIError, toAIError } from "@/lib/ai/llm"

const logError = vi.fn()
vi.mock("@/lib/error-log", () => ({ logError: (...a: unknown[]) => logError(...a) }))


const apiError = (status: number, message: string) =>
  OpenAI.APIError.generate(status, { message }, message, new Headers())

describe("toAIError", () => {
  beforeEach(() => logError.mockClear())

  it("out of credits: outage message, logged once per 10 minutes", () => {
    const e = toAIError(apiError(402, "Insufficient credits"))
    expect(e).toBeInstanceOf(AIError)
    expect(e.userMessage).toMatch(/temporarily unavailable/)
    toAIError(apiError(402, "Insufficient credits"))
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][1]).toMatch(/^AI outage: out of credits/)
  })

  it("rejected key: outage message and its own log entry", () => {
    expect(toAIError(apiError(401, "No auth credentials found")).userMessage).toMatch(/temporarily unavailable/)
    expect(logError).toHaveBeenCalledTimes(1)
    expect(logError.mock.calls[0][1]).toMatch(/^AI outage: API key rejected/)
  })

  it("moderation 403 is not an outage", () => {
    expect(toAIError(apiError(403, "Input was flagged by moderation")).userMessage).toMatch(/rephrasing/)
    expect(logError).not.toHaveBeenCalled()
  })

  it("rate limits and bad requests are not logged", () => {
    expect(toAIError(apiError(429, "slow down")).userMessage).toMatch(/busy/)
    expect(toAIError(apiError(400, "bad")).userMessage).toMatch(/had a problem/)
    expect(logError).not.toHaveBeenCalled()
  })

  it("provider 5xx and connection errors are logged but not called outages", () => {
    toAIError(apiError(502, "bad gateway"))
    toAIError(new OpenAI.APIConnectionError({ message: "ECONNRESET" }))
    expect(logError.mock.calls.map((c) => c[1])).toEqual(["AI provider error (5xx)", "AI provider unreachable"])
  })

  it("keeps AIErrors as they are", () => {
    const original = new AIError("x", "y")
    expect(toAIError(original)).toBe(original)
  })
})
