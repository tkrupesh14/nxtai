import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/** Home-screen icon: the favicon's blue tile with a white K, full-bleed (iOS rounds the corners). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#2563eb" }}>
        <svg width="112" height="112" viewBox="0 0 64 64">
          <path d="M22 16v32M22 34l18-18M28 28l13 20" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>
    ),
    size,
  )
}
