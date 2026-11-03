import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ImageResponse } from "next/og"

export const OG_SIZE = { width: 1200, height: 630 }
const BLUE = "#2563eb"

async function geist(weight: "Regular" | "Bold") {
  return readFile(join(process.cwd(), `node_modules/geist/dist/fonts/geist-sans/Geist-${weight}.ttf`))
}

/** The Krpex sharing card: brand mark, a kicker line, a big title and a short line under it. */
export async function ogCard({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  const [regular, bold] = await Promise.all([geist("Regular"), geist("Bold")])
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 60%, #dbeafe 100%)",
          color: "#0f172a",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: BLUE }} />
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>Krpex</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: BLUE, fontWeight: 700 }}>{kicker}</div>
          <div style={{ fontSize: title.length > 40 ? 60 : 72, fontWeight: 700, lineHeight: 1.1, marginTop: 12, letterSpacing: -1.5 }}>
            {title}
          </div>
          <div style={{ fontSize: 30, color: "#475569", marginTop: 24, lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 24, color: "#64748b" }}>krpex.in</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  )
}
