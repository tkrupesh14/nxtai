"use client"

import Link from "next/link"
import { useState } from "react"

import type { Category } from "@/lib/learning/catalog"
import { cn } from "@/lib/utils"

const FILTERS = [
  { id: "all", label: "All subjects" },
  { id: "tech", label: "Tech & data" },
  { id: "non_tech", label: "Beyond tech" },
] as const

/** Homepage subject areas with a filter; each card opens that area on /courses. */
export function SubjectGrid({ categories }: { categories: Pick<Category, "id" | "name" | "icon" | "group" | "subcategories">[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all")
  const shown = categories.filter((c) => filter === "all" || c.group === filter)
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter subjects">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <li key={c.id} className="group relative rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl">
                {c.icon}
              </span>
              <h3 className="font-semibold tracking-tight">
                <Link href={`/courses#${c.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
                  {c.name}
                </Link>
              </h3>
              <span aria-hidden className="ml-auto text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                →
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {c.subcategories
                .slice(0, 4)
                .map((s) => s.name)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
