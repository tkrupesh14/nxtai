import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

import { CodeBlock } from "@/components/learn/code-block"

// Learners' Markdown (community posts and comments). Raw HTML is never rendered (react-markdown escapes it), unsafe
// URLs are dropped by react-markdown's default urlTransform, images show as plain links, and every link is marked
// nofollow/ugc and opens in a new tab.

const REHYPE = [[rehypeHighlight, { detect: false }]] as React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"]

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ?? "lesson-prose text-[15px]"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={REHYPE}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="nofollow ugc noopener noreferrer" className="break-words text-primary underline underline-offset-2">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" && src ? (
              <a href={src} target="_blank" rel="nofollow ugc noopener noreferrer" className="break-all text-primary underline underline-offset-2">
                {alt || src}
              </a>
            ) : null,
          pre: (props) => <CodeBlock {...props} />,
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
