import type { MetadataRoute } from "next"

import { CATALOG } from "@/lib/learning/course-catalog"

const BASE = "https://krpex.in"

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/courses", "/pricing", "/about", "/contact", "/terms", "/privacy", "/refund-policy"]
  return [
    ...pages.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...CATALOG.map((c) => ({ url: `${BASE}/courses/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ]
}
