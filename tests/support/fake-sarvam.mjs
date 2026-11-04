// A stand-in for Sarvam's batch speech-to-text API (tracker 8.4), used by the signed-in browser tests. Upload links
// point back here; every job "transcribes" to a fixed Hindi-English physics transcript after one status check.
// Uploads must arrive with Content-Length and a content type, as Sarvam's (S3) upload links require.
import { createServer } from "node:http"

export const FAKE_TRANSCRIPT = {
  transcript: "Newton का दूसरा नियम कहता है कि force बराबर mass गुणा acceleration होता है।",
  timestamps: {
    words: ["Newton का दूसरा नियम कहता है कि force बराबर mass गुणा acceleration होता है।", "अब एक example देखते हैं।"],
    start_time_seconds: [0, 65],
    end_time_seconds: [4.5, 70],
  },
  diarized_transcript: null,
  language_code: "hi-IN",
}

export function startFakeSarvam(port = 3198) {
  const jobs = new Map() // job_id → { uploaded: bytes, checks }
  const base = `http://127.0.0.1:${port}`
  const json = (res, status, body) => {
    res.writeHead(status, { "content-type": "application/json" })
    res.end(JSON.stringify(body))
  }
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", base)
    const path = url.pathname
    if (req.method === "GET" && path === "/") return res.end("fake sarvam ok")

    if (req.method === "PUT" && path.startsWith("/upload/")) {
      const job = jobs.get(path.split("/")[2])
      const length = Number(req.headers["content-length"])
      if (!job || !length || !req.headers["content-type"]) {
        req.resume()
        return json(res, 400, { error: "needs a job, content-length and content-type" })
      }
      let n = 0
      req.on("data", (c) => (n += c.length))
      req.on("end", () => {
        job.uploaded = n
        res.writeHead(n === length ? 200 : 400)
        res.end()
      })
      return
    }
    if (req.method === "GET" && path.startsWith("/download/")) return json(res, 200, FAKE_TRANSCRIPT)

    if (req.headers["api-subscription-key"] !== "fake") return json(res, 403, { error: { message: "bad key" } })
    let raw = ""
    req.on("data", (c) => (raw += c))
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {}
      const status = (id, state) => ({
        job_id: id,
        job_state: state,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        storage_container_type: "AWS",
        total_files: 1,
        successful_files_count: state === "Completed" ? 1 : 0,
        failed_files_count: 0,
        error_message: "",
        job_details:
          state === "Completed"
            ? [{ inputs: [{ file_name: "lecture", file_id: "0" }], outputs: [{ file_name: "0.json", file_id: "0.json" }], state: "Success", error_message: "" }]
            : [],
      })
      if (req.method === "POST" && path === "/speech-to-text/job/v1") {
        const id = `fake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        jobs.set(id, { uploaded: 0, checks: 0 })
        return json(res, 200, { job_id: id, storage_container_type: "AWS", job_parameters: body.job_parameters ?? {}, job_state: "Accepted" })
      }
      if (req.method === "POST" && path === "/speech-to-text/job/v1/upload-files") {
        const urls = Object.fromEntries(body.files.map((f) => [f, { file_url: `${base}/upload/${body.job_id}/${f}` }]))
        return json(res, 200, { job_id: body.job_id, job_state: "Accepted", upload_urls: urls, storage_container_type: "AWS" })
      }
      if (req.method === "POST" && path === "/speech-to-text/job/v1/download-files") {
        const urls = Object.fromEntries(body.files.map((f) => [f, { file_url: `${base}/download/${body.job_id}/${f}` }]))
        return json(res, 200, { job_id: body.job_id, job_state: "Completed", download_urls: urls, storage_container_type: "AWS" })
      }
      const m = /^\/speech-to-text\/job\/v1\/([^/]+)\/(start|status)$/.exec(path)
      const job = m && jobs.get(m[1])
      if (!job) return json(res, 404, { error: { message: `fake sarvam: unknown ${req.method} ${path}` } })
      if (m[2] === "start") return json(res, 200, status(m[1], job.uploaded ? "Pending" : "Failed"))
      job.checks++
      return json(res, 200, status(m[1], job.checks >= 1 ? "Completed" : "Running"))
    })
  })
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 3198)
  await startFakeSarvam(port)
  console.log(`fake Sarvam listening on ${`http://127.0.0.1:${port}`}`)
}
