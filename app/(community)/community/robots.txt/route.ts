// robots.txt for community.krpex.in (next.config.mjs maps /robots.txt there onto this route).
export function GET() {
  return new Response("User-agent: *\nAllow: /\nSitemap: https://community.krpex.in/sitemap.xml\n", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
