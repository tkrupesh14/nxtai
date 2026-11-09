"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CodeLanguage } from "@/components/code/editor"
import { RESULT_MARK } from "@/lib/code/harness"

export type OutputLine = { kind: "out" | "err" | "info"; text: string }
export type RunState = "idle" | "loading" | "running"
export type RunEnd = { status: "done" | "timeout" | "stopped"; ok: boolean; stdout: string; stderr: string }

// The test harness's results line (lib/code/harness.ts) is read by the page, not shown to the learner.
const hideResults = (text: string) => (text.includes(RESULT_MARK) ? text.replace(new RegExp(`${RESULT_MARK}[^\\n]*\\n?`), "") : text)

/**
 * Runs code in the learner's browser through public/code-runner.html, a sandboxed iframe (opaque origin) with a
 * Web Worker inside. Nothing is sent to our server.
 */
export function useRunner({ timeoutMs = 5000 }: { timeoutMs?: number } = {}) {
  const frame = useRef<HTMLIFrameElement | null>(null)
  const ready = useRef<Promise<void> | null>(null)
  const markReady = useRef<() => void>(() => {})
  const runId = useRef(0)
  const finish = useRef<((end: RunEnd) => void) | null>(null)
  const stdout = useRef("")
  const stderr = useRef("")
  const [state, setState] = useState<RunState>("idle")
  const [output, setOutput] = useState<OutputLine[]>([])
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    ready.current = new Promise((resolve) => (markReady.current = resolve))
    const f = document.createElement("iframe")
    f.src = "/code-runner.html"
    f.setAttribute("sandbox", "allow-scripts")
    f.setAttribute("aria-hidden", "true")
    f.tabIndex = -1
    f.style.display = "none"
    document.body.appendChild(f)
    frame.current = f

    const onMessage = (e: MessageEvent) => {
      if (e.source !== f.contentWindow) return
      const m = e.data as { type: string; id?: string; text?: string; ms?: number; ok?: boolean }
      if (m.type === "ready") return markReady.current()
      if (m.id !== String(runId.current)) return
      if (m.type === "status") setOutput((o) => [...o, { kind: "info", text: `${m.text}\n` }])
      else if (m.type === "started") {
        setState("running")
        setOutput((o) => o.filter((l) => l.kind !== "info"))
      } else if (m.type === "out" || m.type === "err") {
        if (m.type === "out") stdout.current += m.text ?? ""
        else stderr.current += m.text ?? ""
        const text = m.type === "out" ? hideResults(m.text ?? "") : (m.text ?? "")
        if (text) setOutput((o) => [...o, { kind: m.type, text } as OutputLine])
      } else if (m.type === "done" || m.type === "timeout" || m.type === "stopped") {
        if (m.type === "timeout") setOutput((o) => [...o, { kind: "err", text: `\nStopped: your code ran for more than ${timeoutMs / 1000} seconds. Check for a loop that never ends.\n` }])
        if (m.type === "stopped") setOutput((o) => [...o, { kind: "info", text: "\nStopped.\n" }])
        setMs(m.type === "done" ? (m.ms ?? null) : null)
        setState("idle")
        finish.current?.({ status: m.type, ok: m.type === "done" && Boolean(m.ok), stdout: stdout.current, stderr: stderr.current })
        finish.current = null
      }
    }
    window.addEventListener("message", onMessage)
    return () => {
      window.removeEventListener("message", onMessage)
      f.remove()
    }
  }, [timeoutMs])

  /** Start downloading Python before the first run. */
  const warm = useCallback(async (lang: CodeLanguage) => {
    await ready.current
    if (lang === "python") frame.current?.contentWindow?.postMessage({ type: "warm", lang }, "*")
  }, [])

  /** Run code; resolves when it ends, with everything it printed. */
  const run = useCallback(
    async (lang: CodeLanguage, code: string, stdin = "") => {
      await ready.current
      runId.current += 1
      setOutput([])
      setMs(null)
      setState("loading")
      return new Promise<RunEnd>((resolve) => {
        finish.current?.({ status: "stopped", ok: false, stdout: stdout.current, stderr: stderr.current })
        stdout.current = ""
        stderr.current = ""
        finish.current = resolve
        frame.current?.contentWindow?.postMessage({ type: "run", id: String(runId.current), lang, code, stdin, timeoutMs }, "*")
      })
    },
    [timeoutMs],
  )

  const stop = useCallback(() => frame.current?.contentWindow?.postMessage({ type: "stop" }, "*"), [])
  const clear = useCallback(() => setOutput([]), [])

  return { run, stop, warm, clear, state, output, ms }
}
