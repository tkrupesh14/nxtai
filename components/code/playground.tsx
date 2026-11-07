"use client"

import { useEffect, useState } from "react"

import { CodeEditor, type CodeLanguage } from "@/components/code/editor"
import { useRunner } from "@/components/code/use-runner"
import { Button } from "@/components/site/ui/button"
import { cn } from "@/lib/utils"

const STARTERS: Record<CodeLanguage, string> = {
  python: `# Write Python here and press Run (Ctrl + Enter).
name = input()  # reads a line from "Input" below
print(f"Hello, {name}!")

squares = [n * n for n in range(1, 6)]
print("Squares:", squares)
`,
  javascript: `// Write JavaScript here and press Run (Ctrl + Enter).
const name = input() // reads a line from "Input" below
console.log(\`Hello, \${name}!\`)

const squares = [1, 2, 3, 4, 5].map((n) => n * n)
console.log("Squares:", squares)
`,
}
const LANGS: { id: CodeLanguage; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
]
const key = (lang: CodeLanguage) => `krpex-code:playground:${lang}`

/** Free coding: write, run, see the output. Code is kept in this browser only. */
export function Playground() {
  const [lang, setLang] = useState<CodeLanguage>("python")
  const [code, setCode] = useState<Record<CodeLanguage, string>>(STARTERS)
  const [stdin, setStdin] = useState("Asha")
  const runner = useRunner()

  // Restore the saved code and language once, then start loading Python in the background.
  useEffect(() => {
    try {
      const saved = { python: localStorage.getItem(key("python")), javascript: localStorage.getItem(key("javascript")) }
      setCode((c) => ({ python: saved.python ?? c.python, javascript: saved.javascript ?? c.javascript }))
      const l = localStorage.getItem("krpex-code:playground:lang")
      if (l === "python" || l === "javascript") setLang(l)
    } catch {}
  }, [])
  const { warm } = runner
  useEffect(() => {
    void warm(lang)
  }, [lang, warm])

  function edit(value: string) {
    setCode((c) => ({ ...c, [lang]: value }))
    try {
      localStorage.setItem(key(lang), value)
    } catch {}
  }
  function pick(l: CodeLanguage) {
    setLang(l)
    try {
      localStorage.setItem("krpex-code:playground:lang", l)
    } catch {}
  }
  const busy = runner.state !== "idle"
  const run = () => void runner.run(lang, code[lang], stdin)

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:h-[calc(100dvh-4.25rem)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:py-5">
      <section aria-label="Code" className="flex min-h-[26rem] flex-col overflow-hidden rounded-xl border bg-card lg:min-h-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div role="tablist" aria-label="Language" className="flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={lang === l.id}
                onClick={() => pick(l.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  lang === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => edit(STARTERS[lang])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
            {busy ? (
              <Button size="sm" variant="outline" onClick={runner.stop}>
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={run}>
                ▶ Run
              </Button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor value={code[lang]} language={lang} onChange={edit} onRun={run} />
        </div>
      </section>

      <div className="grid min-h-0 gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
        <section aria-label="Input" className="rounded-xl border bg-card p-3">
          <label htmlFor="stdin" className="text-sm font-medium">
            Input <span className="font-normal text-muted-foreground">· one line per input() call</span>
          </label>
          <textarea
            id="stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            spellCheck={false}
            className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm"
          />
        </section>
        <section aria-label="Output" className="flex min-h-56 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
            <span className="font-medium">Output</span>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              {runner.state === "loading" ? "Starting…" : runner.state === "running" ? "Running…" : runner.ms !== null ? `Finished in ${runner.ms} ms` : ""}
            </span>
          </div>
          <pre
            className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-sm"
            aria-live="polite"
          >
            {runner.output.length === 0 && runner.state === "idle" ? (
              <span className="text-muted-foreground">Press Run to see what your code prints.</span>
            ) : (
              runner.output.map((l, i) => (
                <span key={i} className={cn(l.kind === "err" && "text-destructive-foreground", l.kind === "info" && "text-muted-foreground")}>
                  {l.text}
                </span>
              ))
            )}
          </pre>
        </section>
        <p className="text-xs text-muted-foreground lg:hidden">Your code runs on this device and is saved in this browser only.</p>
      </div>
    </div>
  )
}
