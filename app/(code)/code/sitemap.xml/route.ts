import { getBetaStatus } from "@/lib/beta/access"
import { CODE_ORIGIN } from "@/lib/code-host"
import { PLANS } from "@/lib/code/plans"
import { PROBLEMS } from "@/lib/code/problems"

const PAGES = ["/", "/problems", "/plans", "/playground", ...PLANS.map((p) => `/plans/${p.slug}`), ...PROBLEMS.map((p) => `/p/${p.slug}`)]

// sitemap.xml for code.krpex.in (proxy.ts maps /sitemap.xml there onto this route). During the closed beta only
// the home page is public, so it's the only page listed.
export async function GET() {
  const pages = (await getBetaStatus()).closed ? ["/"] : PAGES
  const urls = pages.map((p) => `  <url><loc>${CODE_ORIGIN}${p === "/" ? "/" : p}</loc><changefreq>weekly</changefreq></url>`).join("\n")
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
