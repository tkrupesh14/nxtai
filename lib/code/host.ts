import "server-only"

import { headers } from "next/headers"

import { codeHref, mainHref, requestHost } from "@/lib/code-host"

/** Link helpers for Krpex Code server components, for the host this request came in on. */
export async function codeLinks() {
  const host = requestHost(await headers())
  return { code: (path: string) => codeHref(path, host), main: (path: string) => mainHref(path, host) }
}
