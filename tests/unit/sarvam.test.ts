// The real Sarvam client code against tests/support/fake-sarvam.mjs: create a job, stream the upload, start it,
// then collect the transcript.
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { checkTranscription, startTranscription } from "@/lib/teach/sarvam"
import { startFakeSarvam } from "../support/fake-sarvam.mjs"

let server: { close: () => void }
beforeAll(async () => {
  server = await startFakeSarvam(3197)
  process.env.SARVAM_API_KEY = "fake"
  process.env.SARVAM_BASE_URL = "http://127.0.0.1:3197"
})
afterAll(() => server.close())

describe("sarvam", () => {
  it("streams a recording and brings back the transcript with times", async () => {
    const bytes = new Uint8Array(200_000).fill(7)
    const body = new Blob([bytes]).stream()
    const jobId = await startTranscription(body, { bytes: bytes.length, contentType: "audio/mpeg", extension: "mp3", language: "hi" })
    expect(jobId).toMatch(/^fake-/)
    const result = await checkTranscription(jobId)
    expect(result).toEqual({
      state: "done",
      transcript: "[0:00] Newton का दूसरा नियम कहता है कि force बराबर mass गुणा acceleration होता है।\n\n[1:05] अब एक example देखते हैं।",
      seconds: 70,
    })
  })
})
