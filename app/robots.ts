import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/learn", "/account", "/admin", "/onboarding", "/api/"] },
    sitemap: "https://krpex.in/sitemap.xml",
  }
}
