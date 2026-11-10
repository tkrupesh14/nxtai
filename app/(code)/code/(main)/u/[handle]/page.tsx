import { permanentRedirect } from "next/navigation"

import { codeLinks } from "@/lib/code/host"

// Profiles moved to Krpex Community (community.krpex.in/u/<handle>); old links keep working.
type Props = { params: Promise<{ handle: string }> }

export default async function OldProfile({ params }: Props) {
  const { handle } = await params
  const links = await codeLinks()
  permanentRedirect(links.community(`/u/${encodeURIComponent(decodeURIComponent(handle).toLowerCase())}`))
}
