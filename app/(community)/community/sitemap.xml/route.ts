import { COMMUNITY_ORIGIN } from "@/lib/code-host"
import { getPublicHandles } from "@/lib/community/data"

// sitemap.xml for community.krpex.in: the home page, the guidelines and every public profile.
export async function GET() {
  const handles = await getPublicHandles()
  const urls = ["/", "/guidelines", ...handles.map((h) => `/u/${h}`)]
    .map((p) => `  <url><loc>${COMMUNITY_ORIGIN}${p}</loc><changefreq>weekly</changefreq></url>`)
    .join("\n")
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
