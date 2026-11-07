// robots.txt for code.krpex.in (proxy.ts maps /robots.txt there onto this route).
export function GET() {
  return new Response("User-agent: *\nAllow: /\nSitemap: https://code.krpex.in/sitemap.xml\n", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  })
}
