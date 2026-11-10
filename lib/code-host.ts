// Krpex Code (5.4) lives on code.krpex.in and Krpex Community (5.6) on community.krpex.in, both served by this same
// app from app/(code)/code/* and app/(community)/community/*. next.config.mjs maps each subdomain's paths onto its
// prefix; proxy.ts does the redirects. On any other host (localhost, CI) /code/* and /community/* are served directly.

export const MAIN_HOST = "krpex.in"
export const CODE_HOST = "code.krpex.in"
export const COMMUNITY_HOST = "community.krpex.in"
export const MAIN_ORIGIN = `https://${MAIN_HOST}`
export const CODE_ORIGIN = `https://${CODE_HOST}`
export const COMMUNITY_ORIGIN = `https://${COMMUNITY_HOST}`

/** The subdomain sites and the path prefix each is served from. */
const SUBSITES = [
  { host: CODE_HOST, prefix: "/code", origin: CODE_ORIGIN },
  { host: COMMUNITY_HOST, prefix: "/community", origin: COMMUNITY_ORIGIN },
] as const

/** Host name without port, lower case. */
export function bareHost(host: string | null | undefined) {
  return (host ?? "").split(":")[0].trim().toLowerCase()
}

/** Host of a request behind Nginx (X-Forwarded-Host first). */
export function requestHost(headers: { get(name: string): string | null }) {
  return bareHost(headers.get("x-forwarded-host") ?? headers.get("host"))
}

export const isCodeHost = (host: string | null | undefined) => bareHost(host) === CODE_HOST
export const isCommunityHost = (host: string | null | undefined) => bareHost(host) === COMMUNITY_HOST
const isSubsiteHost = (host: string | null | undefined) => isCodeHost(host) || isCommunityHost(host)
export const isMainHost = (host: string | null | undefined) => {
  const h = bareHost(host)
  return h === MAIN_HOST || h === `www.${MAIN_HOST}`
}

/**
 * Domain for the sign-in cookies, so one sign-in works on krpex.in and code.krpex.in.
 * Undefined elsewhere (localhost, CI), which keeps the browser's default host-only cookies.
 */
export function authCookieDomain(host: string | null | undefined) {
  const h = bareHost(host)
  return h === MAIN_HOST || h.endsWith(`.${MAIN_HOST}`) ? `.${MAIN_HOST}` : undefined
}

/** Link to a Krpex Code page ("/playground"): as is on code.krpex.in, absolute from the community site, under /code elsewhere. */
export function codeHref(path: string, host: string | null | undefined) {
  const p = path === "/" ? "" : path
  if (isCodeHost(host)) return p || "/"
  return isCommunityHost(host) ? `${CODE_ORIGIN}${p || "/"}` : `/code${p}`
}

/** Link to a Krpex Community page ("/u/asha"): as is on community.krpex.in, absolute from Code, under /community elsewhere. */
export function communityHref(path: string, host: string | null | undefined) {
  const p = path === "/" ? "" : path
  if (isCommunityHost(host)) return p || "/"
  return isCodeHost(host) ? `${COMMUNITY_ORIGIN}${p || "/"}` : `/community${p}`
}

/** Link to a main-site page ("/learn") from a subdomain site: absolute there, as is elsewhere. */
export function mainHref(path: string, host: string | null | undefined) {
  return isSubsiteHost(host) ? `${MAIN_ORIGIN}${path}` : path
}

/** App-wide files served from the root on both hosts (icons, manifest, the code runner). */
const SHARED_FILES = /^\/(manifest\.webmanifest|icon\.svg|apple-icon(\.png)?|favicon\.ico|code-runner\.html)$/

/**
 * Where proxy.ts sends a request: rewrite a subdomain's paths onto its prefix, and redirect a prefixed path
 * (krpex.in/code/*, community.krpex.in/code/*, code.krpex.in/community/* …) to the subdomain it belongs to.
 * API routes and Next's own files are shared and pass through.
 */
export function codeRoute(host: string, pathname: string, search: string):
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | null {
  const under = SUBSITES.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`))
  const redirect = under && { kind: "redirect" as const, url: `${under.origin}${pathname.slice(under.prefix.length) || "/"}${search}` }
  const site = SUBSITES.find((s) => s.host === bareHost(host))
  if (site) {
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || SHARED_FILES.test(pathname)) return null
    if (redirect) return redirect
    return { kind: "rewrite", pathname: `${site.prefix}${pathname === "/" ? "" : pathname}` }
  }
  if (isMainHost(host) && redirect) return redirect
  return null
}
