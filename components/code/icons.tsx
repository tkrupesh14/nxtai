import type { SVGProps } from "react"

// Small line icons for Krpex Code (24×24, stroke = currentColor). Inline so no icon package is needed.
type P = SVGProps<SVGSVGElement>
const base = (props: P) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
})

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
export const IconCircleCheck = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
)
export const IconDot = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
  </svg>
)
export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const IconShuffle = (p: P) => (
  <svg {...base(p)}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
export const IconList = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
)
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const IconPlay = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4v16l13-8z" fill="currentColor" stroke="none" />
  </svg>
)
export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </svg>
)
export const IconStop = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
)
export const IconReset = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)
export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconBulb = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
  </svg>
)
export const IconTag = (p: P) => (
  <svg {...base(p)}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </svg>
)
export const IconDoc = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M8 13h8M8 17h5" />
  </svg>
)
export const IconFlask = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3" />
    <path d="M7 15h10" />
  </svg>
)
export const IconHistory = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </svg>
)
export const IconKey = (p: P) => (
  <svg {...base(p)}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2" />
  </svg>
)
export const IconTerminal = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 17 6-5-6-5M12 19h8" />
  </svg>
)
export const IconCode = (p: P) => (
  <svg {...base(p)}>
    <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
  </svg>
)
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2 1.5-3 3.5-3 6-1-1-2-2-2-4-2 2-5 4.6-5 8 0 4.3 3 7 7 7z" />
  </svg>
)
export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)
export const IconExpand = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
)
