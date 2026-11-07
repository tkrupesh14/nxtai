import type { MetadataRoute } from "next"

// Lets people add Krpex to their Home Screen; on iPhone this is needed for push notifications (9.4).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krpex",
    short_name: "Krpex",
    description: "Your personal course, taught by an AI professor.",
    start_url: "/learn",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
