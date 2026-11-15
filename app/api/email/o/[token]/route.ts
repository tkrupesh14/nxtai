import { trackEmail } from "@/lib/email/campaign-server"

// The open image in campaign emails: a transparent 1×1 GIF. Opens are approximate (Apple Mail loads every
// image; some apps block them), so results lean on clicks and sign-ups.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  await trackEmail((await params).token, "open")
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, private", "Content-Length": String(GIF.length) },
  })
}
