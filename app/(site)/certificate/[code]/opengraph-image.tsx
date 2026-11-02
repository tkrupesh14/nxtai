import { ImageResponse } from "next/og"

import { getPublicCertificate, issuedOn } from "@/lib/learning/certificate"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Krpex certificate of completion"

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const cert = await getPublicCertificate(code)
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f1e7", padding: 28 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "4px solid #b08d57",
            borderRadius: 16,
            background: "#ffffff",
            color: "#171717",
            textAlign: "center",
            padding: 48,
          }}
        >
          <div style={{ fontSize: 26, letterSpacing: 10, color: "#8a6a35", fontWeight: 700 }}>KRPEX</div>
          <div style={{ fontSize: 56, marginTop: 24 }}>Certificate of Completion</div>
          {cert ? (
            <>
              <div style={{ fontSize: 48, marginTop: 36, fontWeight: 700 }}>{cert.full_name}</div>
              <div style={{ fontSize: 30, marginTop: 18, color: "#404040" }}>{cert.course_title}</div>
              <div style={{ fontSize: 22, marginTop: 28, color: "#737373" }}>
                {`Final exam ${cert.score}% · ${issuedOn(cert.issued_at)} · ${cert.code}`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 30, marginTop: 36, color: "#737373" }}>Certificate not found</div>
          )}
        </div>
      </div>
    ),
    size,
  )
}
