import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { CodeBlock } from "@/components/learn/code-block"
import { DiagramView } from "@/components/learn/diagram-view"

import { Checkpoint } from "@/components/learn/lecture"
import { ProfessorAvatar } from "@/components/learn/professor"
import type { Professor } from "@/lib/learning/catalog"
import { tidyMarkdown } from "@/lib/learning/math"
import type { LessonBlock } from "@/lib/learning/schemas"
import { cn } from "@/lib/utils"

// Math is written as $$...$$ (inline or on its own line). Single $ stays a currency sign ("$5").
const REMARK = [remarkGfm, [remarkMath, { singleDollarTextMath: false }]] as React.ComponentProps<typeof ReactMarkdown>["remarkPlugins"]
const REHYPE = [
  [rehypeKatex, { throwOnError: false, strict: "ignore" }],
  [rehypeHighlight, { detect: false }],
] as React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]

export function Md({ children, className, compact }: { children: string; className?: string; compact?: boolean }) {
  return (
    <div className={cn("lesson-prose", compact && "lesson-prose-compact", className)}>
      <ReactMarkdown
        remarkPlugins={REMARK}
        rehypePlugins={REHYPE}
        components={{ pre: (props) => <CodeBlock {...props} /> }}
      >
        {tidyMarkdown(children)}
      </ReactMarkdown>
    </div>
  )
}

function Callout({
  icon,
  label,
  tone,
  title,
  children,
}: {
  icon: string
  label: string
  tone: "accent" | "amber" | "green" | "muted" | "primary"
  title?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-xl border p-5 md:p-6",
        tone === "accent" && "border-accent/40 bg-accent/5",
        tone === "amber" && "border-amber-500/40 bg-amber-500/5",
        tone === "green" && "border-green-600/30 bg-green-600/5",
        tone === "muted" && "bg-muted/40",
        tone === "primary" && "border-primary/30 bg-primary/5",
      )}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{icon}</span> {label}
      </p>
      {title ? <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2> : null}
      {children}
    </section>
  )
}

function Items({ items, marker = "disc" }: { items: string[]; marker?: "disc" | "check" }) {
  if (!items.length) return null
  return (
    <ul className={cn("mt-3 grid gap-2 text-[0.95rem]", marker === "disc" && "list-disc pl-5")}>
      {items.map((it, i) => (
        <li key={i} className={cn(marker === "check" && "flex gap-2")}>
          {marker === "check" && (
            <span className="text-primary" aria-hidden>
              ✓
            </span>
          )}
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

/** One lecture block, styled by its role in the lesson. */
export function LessonBlockView({ block, id, professor }: { block: LessonBlock; id: string; professor: Professor }) {
  const body = block.body_markdown.trim()
  switch (block.type) {
    case "opening":
      return (
        <section className="flex items-start gap-4">
          <ProfessorAvatar professor={professor} size="lg" />
          <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm border bg-card p-5 shadow-sm">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{professor.name}</p>
            {block.title ? <h2 className="mb-2 text-lg font-semibold tracking-tight">{block.title}</h2> : null}
            {body && <Md>{body}</Md>}
          </div>
        </section>
      )
    case "objectives":
      return (
        <Callout icon="🎯" label="Today's objectives" tone="primary">
          {body && <Md>{body}</Md>}
          <Items items={block.items} marker="check" />
        </Callout>
      )
    case "analogy":
      return (
        <Callout icon="💡" label="Professor's analogy" tone="accent" title={block.title}>
          {body && <Md>{body}</Md>}
        </Callout>
      )
    case "worked_example":
      return (
        <Callout icon="🧪" label="Worked example" tone="muted" title={block.title}>
          {body && <Md>{body}</Md>}
          <Items items={block.items} />
        </Callout>
      )
    case "checkpoint":
      return (
        <Callout icon="⏸️" label="Pause and think" tone="primary" title={block.title}>
          {body && <Md>{body}</Md>}
          {block.checkpoint && (
            <Checkpoint
              id={id}
              answerIndex={block.checkpoint.answer_index}
              question={<Md compact>{block.checkpoint.question}</Md>}
              options={block.checkpoint.options.map((o, i) => (
                <Md key={i} compact>
                  {o}
                </Md>
              ))}
              explanation={<Md compact>{block.checkpoint.explanation}</Md>}
            />
          )}
        </Callout>
      )
    case "common_mistakes":
      return (
        <Callout icon="⚠️" label="Common mistakes" tone="amber" title={block.title}>
          {body && <Md>{body}</Md>}
          <Items items={block.items} />
        </Callout>
      )
    case "real_world":
      return (
        <Callout icon="🌍" label="In the real world" tone="green" title={block.title}>
          {body && <Md>{body}</Md>}
        </Callout>
      )
    case "summary":
      return (
        <Callout icon="📌" label="Summary" tone="primary" title={block.title}>
          {body && <Md>{body}</Md>}
          <Items items={block.items} marker="check" />
        </Callout>
      )
    case "diagram":
      return (
        <Callout icon="🗺️" label="Diagram" tone="muted" title={block.title}>
          <figure className="grid gap-3">
            <DiagramView diagram={block.diagram} />
            {body ? (
              <figcaption>
                <Md compact>{body}</Md>
              </figcaption>
            ) : null}
          </figure>
        </Callout>
      )
    case "homework":
      return (
        <section className="rounded-xl border-2 border-dashed p-5 md:p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span aria-hidden>📝</span> Homework before next class
          </p>
          {block.title ? <h2 className="mb-3 text-lg font-semibold tracking-tight">{block.title}</h2> : null}
          {body && <Md>{body}</Md>}
          <Items items={block.items} />
        </section>
      )
    default:
      return (
        <section>
          {block.title ? <h2 className="mb-3 text-xl font-semibold tracking-tight">{block.title}</h2> : null}
          {body && <Md>{body}</Md>}
          <Items items={block.items} />
        </section>
      )
  }
}
