"use client"

import { show, type CodeLanguage } from "@/lib/code/harness"
import { cn } from "@/lib/utils"

import type { CaseRun } from "./types"

/** Input / Output / Expected / Stdout blocks for one test case, as in the console and the submit result. */
export function CaseView({ run, params, lang }: { run: CaseRun; params: string[]; lang: CodeLanguage }) {
  const r = run.result
  return (
    <div className="space-y-3">
      <Field label="Input">
        {params.map((p, i) => (
          <Block key={p}>
            <span className="text-muted-foreground">{p} =</span> {show(run.args[i], lang, 2000)}
          </Block>
        ))}
      </Field>
      {r?.out ? (
        <Field label="Stdout">
          <Block>
            <span className="whitespace-pre-wrap">{r.out.replace(/\n$/, "")}</span>
          </Block>
        </Field>
      ) : null}
      {r && (
        <Field label={r.error ? "Error" : "Output"}>
          <Block className={cn(!r.ok && run.expected.known && "text-destructive-foreground")}>{r.error ?? show(r.got, lang, 2000)}</Block>
        </Field>
      )}
      <Field label="Expected">
        {run.expected.known ? (
          <Block>{show(run.expected.value, lang, 2000)}</Block>
        ) : (
          <p className="text-sm text-muted-foreground">{run.expected.reason}</p>
        )}
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Block({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("break-all rounded-lg bg-muted/70 px-3 py-2 font-mono text-[13px] leading-relaxed", className)}>{children}</div>
}
