"use client"

import { useEffect, useRef } from "react"
import { indentWithTab } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { defaultHighlightStyle, HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { basicSetup } from "codemirror"

export type CodeLanguage = "python" | "javascript"

// Colours come from the site's theme variables, so light and dark mode follow the toggle.
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "var(--code-font, 14px)", backgroundColor: "var(--card)", color: "var(--foreground)" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-gutters": { backgroundColor: "var(--card)", color: "var(--muted-foreground)", borderRight: "1px solid var(--border)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in oklab, var(--primary) 7%, transparent)" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--primary) 25%, transparent) !important",
  },
})

// CodeMirror's default syntax colours, each behind a variable (--cm-708 for #708) so dark mode can swap in
// readable ones (code.css). Light mode keeps the defaults.
const highlight = syntaxHighlighting(
  HighlightStyle.define(
    defaultHighlightStyle.specs.map((s) => (typeof s.color === "string" && s.color.startsWith("#") ? { ...s, color: `var(--cm-${s.color.slice(1)}, ${s.color})` } : s)),
  ),
)

/** Keys that are awkward on a phone keyboard. */
const EXTRA_KEYS = ["Tab", "(", ")", "[", "]", "{", "}", ":", "=", '"', "'", "#"]

export function CodeEditor({
  value,
  language,
  onChange,
  onRun,
  onSubmit,
  readOnly = false,
  extraKeys = true,
  label = "Code editor",
}: {
  value: string
  language: CodeLanguage
  onChange?: (code: string) => void
  /** Ctrl/⌘ + Enter, or Ctrl/⌘ + ' when onSubmit is set. */
  onRun?: () => void
  /** Ctrl/⌘ + Enter. */
  onSubmit?: () => void
  readOnly?: boolean
  /** The row of awkward keys on phones. */
  extraKeys?: boolean
  label?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const latest = useRef({ onChange, onRun, onSubmit })
  latest.current = { onChange, onRun, onSubmit }

  useEffect(() => {
    if (!host.current) return
    const v = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                const { onRun, onSubmit } = latest.current
                ;(onSubmit ?? onRun)?.()
                return true
              },
            },
            { key: "Mod-'", run: () => (latest.current.onSubmit ? (latest.current.onRun?.(), true) : false) },
            indentWithTab,
          ]),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          basicSetup,
          highlight,
          language === "python" ? python() : javascript(),
          EditorState.tabSize.of(4),
          theme,
          EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) latest.current.onChange?.(u.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = v
    return () => {
      v.destroy()
      view.current = null
    }
    // A new editor per language; outside changes to `value` are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, label, readOnly])

  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  function insert(key: string) {
    const v = view.current
    if (!v) return
    const text = key === "Tab" ? (language === "python" ? "    " : "  ") : key
    v.dispatch(v.state.replaceSelection(text))
    v.focus()
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={host} className="min-h-0 flex-1 overflow-hidden" />
      {extraKeys && !readOnly && (
      <div className="flex gap-1 overflow-x-auto border-t bg-muted/40 px-2 py-1.5 sm:hidden" aria-label="Extra keys">
        {EXTRA_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(k)}
            className="min-w-9 shrink-0 rounded-md border bg-card px-2 py-1 font-mono text-sm"
          >
            {k}
          </button>
        ))}
      </div>
      )}
    </div>
  )
}
