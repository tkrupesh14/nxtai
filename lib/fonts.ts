import { Noto_Sans_Devanagari } from "next/font/google"

/**
 * Hindi text (8.3). Geist has no Devanagari letters, so the browser takes them from this font; it only downloads
 * when a page has Hindi on it (the font is limited to the Devanagari range).
 */
export const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
})
