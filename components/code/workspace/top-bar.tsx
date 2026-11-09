"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { DifficultyText } from "@/components/code/difficulty-badge"
import { IconChevronLeft, IconChevronRight, IconCircleCheck, IconDot, IconList, IconPlay, IconSearch, IconShuffle, IconStop, IconUpload, IconX } from "@/components/code/icons"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { cn } from "@/lib/utils"

import type { ListItem } from "./types"

const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"

export function TopBar({
  list,
  current,
  hrefPrefix,
  problemsHref,
  loginHref,
  accountHref,
  user,
  busy,
  saving,
  onRun,
  onSubmit,
  onStop,
}: {
  list: ListItem[]
  current: string
  hrefPrefix: string
  problemsHref: string
  loginHref: string
  accountHref: string
  user: { initials: string; name: string } | null
  busy: boolean
  saving: boolean
  onRun: () => void
  onSubmit: () => void
  onStop: () => void
}) {
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const at = list.findIndex((p) => p.slug === current)
  const prev = at > 0 ? list[at - 1] : null
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null
  const [mod, setMod] = useState("Ctrl")
  useEffect(() => setMod(MOD), [])

  function random() {
    const pool = list.filter((p) => p.slug !== current && p.state !== "solved")
    const from = pool.length ? pool : list.filter((p) => p.slug !== current)
    router.push(`${hrefPrefix}${from[Math.floor(Math.random() * from.length)].slug}`)
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 px-2 sm:px-3">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
        <Link href={problemsHref} className="mr-1 flex items-center gap-2 rounded-md px-1.5 py-1" title="Krpex Code — all problems">
          <span aria-hidden className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
            {"</>"}
          </span>
          <span className="hidden text-[15px] font-semibold tracking-tight md:inline">
            Krpex <span className="text-primary">Code</span>
          </span>
        </Link>
        <span aria-hidden className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <button type="button" onClick={() => setDrawer(true)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted" aria-haspopup="dialog">
          <IconList /> <span className="hidden sm:inline">Problem list</span>
        </button>
        <NavIcon href={prev ? `${hrefPrefix}${prev.slug}` : null} label={prev ? `Previous: ${prev.title}` : "No previous problem"}>
          <IconChevronLeft />
        </NavIcon>
        <NavIcon href={next ? `${hrefPrefix}${next.slug}` : null} label={next ? `Next: ${next.title}` : "No next problem"}>
          <IconChevronRight />
        </NavIcon>
        <button type="button" onClick={random} className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex" title="Random problem you haven't solved" aria-label="Random problem">
          <IconShuffle />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {busy ? (
          <button type="button" onClick={onStop} aria-label="Stop" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-muted px-3 text-sm font-medium hover:bg-muted/70">
            <IconStop width={13} height={13} /> <span className="hidden sm:inline">Stop</span>
          </button>
        ) : (
          <button type="button" onClick={onRun} aria-label="Run" title={`Run the test cases (${mod} + ')`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-muted px-3 text-sm font-medium hover:bg-muted/70">
            <IconPlay width={13} height={13} /> <span className="hidden sm:inline">Run</span>
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || saving}
          aria-label="Submit"
          title={`Submit: run every test and save (${mod} + Enter)`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-600 px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-teal-500 dark:text-teal-950"
        >
          <IconUpload width={14} height={14} /> <span className="hidden sm:inline">Submit</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <span className="hidden sm:block">
          <ThemeToggle />
        </span>
        {user ? (
          <a href={accountHref} title={`${user.name} · your account`} className="flex size-8 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
            {user.initials}
          </a>
        ) : (
          <a href={loginHref} className="inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium text-primary hover:bg-muted">
            Log in
          </a>
        )}
      </div>

      {drawer && <ProblemDrawer list={list} current={current} hrefPrefix={hrefPrefix} problemsHref={problemsHref} onClose={() => setDrawer(false)} />}
    </header>
  )
}

function NavIcon({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href)
    return (
      <span className="rounded-md p-1.5 text-muted-foreground/40" aria-label={label} role="img">
        {children}
      </span>
    )
  return (
    <Link href={href} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={label} title={label}>
      {children}
    </Link>
  )
}

function ProblemDrawer({ list, current, hrefPrefix, problemsHref, onClose }: { list: ListItem[]; current: string; hrefPrefix: string; problemsHref: string; onClose: () => void }) {
  const [q, setQ] = useState("")
  const panel = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? list.filter((p) => p.title.toLowerCase().includes(s) || String(p.number) === s || p.tags.some((t) => t.toLowerCase().includes(s))) : list
  }, [list, q])
  const solved = list.filter((p) => p.state === "solved").length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    panel.current?.querySelector<HTMLElement>("[data-current]")?.scrollIntoView({ block: "center" })
    panel.current?.querySelector<HTMLInputElement>("input")?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Problem list">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close the problem list" onClick={onClose} />
      <div ref={panel} className="absolute inset-y-0 left-0 flex w-[min(440px,92vw)] flex-col border-r bg-background shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <Link href={problemsHref} className="font-semibold hover:text-primary">
              Problems
            </Link>
            <p className="text-xs text-muted-foreground">
              {solved} of {list.length} solved
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <IconX />
          </button>
        </div>
        <label className="relative mx-4 mt-3 block">
          <span className="sr-only">Search problems</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50" />
        </label>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {rows.map((p) => (
            <li key={p.slug}>
              <Link
                href={`${hrefPrefix}${p.slug}`}
                onClick={onClose}
                data-current={p.slug === current ? "" : undefined}
                aria-current={p.slug === current ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted", p.slug === current && "bg-muted font-medium")}
              >
                <span className="w-4 shrink-0">
                  {p.state === "solved" ? (
                    <IconCircleCheck width={15} height={15} className="text-teal-600 dark:text-teal-400" />
                  ) : p.state === "tried" ? (
                    <IconDot width={15} height={15} className="text-amber-600 dark:text-amber-400" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {p.number}. {p.title}
                </span>
                <DifficultyText difficulty={p.difficulty} className="text-xs" />
              </Link>
            </li>
          ))}
          {rows.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">No problems match.</li>}
        </ul>
      </div>
    </div>
  )
}
