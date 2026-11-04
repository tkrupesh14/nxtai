// First Sarvam speech-to-text call (tracker 8.4). Usage: node --env-file=.env scripts/sarvam-transcribe.mjs <audio file>
// Real-time API: clips up to 30 seconds. Long lectures will use Sarvam's batch API.
import { createReadStream } from "node:fs"

import { SarvamAIClient } from "sarvamai"

const file = process.argv[2]
if (!file) {
  console.error("Usage: node --env-file=.env scripts/sarvam-transcribe.mjs <audio file>")
  process.exit(1)
}

const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY })
const result = await client.speechToText.transcribe({
  file: createReadStream(file),
  model: "saaras:v4",
  mode: "codemix", // Hindi in Devanagari, English words (force, mass…) kept in English
  language_code: "unknown", // auto-detect
})
console.log(JSON.stringify(result, null, 2))
