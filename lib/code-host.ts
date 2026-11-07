// Krpex Code (5.4) lives on code.krpex.in but is served by this same app from app/(code)/code/*.
// proxy.ts maps the subdomain's paths onto /code/*; on any other host (localhost, CI) /code/* is served directly.

export const MAIN_HOST = "krpex.in"
export const CODE_HOST = "code.krpex.in"
export const MAIN_ORIGIN = `https://${MAIN_HOST}`
export const CODE_ORIGIN = `https://${CODE_HOST}`

/** Host name without port, lower case. */
export function bareHost(host: string | null | undefined) {
  return (host ?? "").split(":")[0].trim().toLowerCase()
}

/** Host of a request behind Nginx (X-Forwarded-Host first). */
export function requestHost(headers: { get(name: string): string | null }) {
  return bareHost(headers.get("x-forwarded-host") ?? headers.get("host"))
}

export const isCodeHost = (host: string | null | undefined) => bareHost(host) === CODE_HOST
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

/** Link to a Krpex Code page ("/playground"): as is on the subdomain, under /code elsewhere. */
export function codeHref(path: string, host: string | null | undefined) {
  const p = path === "/" ? "" : path
  return isCodeHost(host) ? p || "/" : `/code${p}`
}

/** Link to a main-site page ("/learn") from Krpex Code: absolute on the subdomain, as is elsewhere. */
export function mainHref(path: string, host: string | null | undefined) {
  return isCodeHost(host) ? `${MAIN_ORIGIN}${path}` : path
}

/** App-wide files served from the root on both hosts (icons, manifest). */
const SHARED_FILES = /^\/(manifest\.webmanifest|icon\.svg|apple-icon(\.png)?|favicon\.ico)$/

/**
 * Where proxy.ts sends a request: rewrite subdomain paths onto /code/*, redirect krpex.in/code/* to the subdomain.
 * API routes and Next's own files are shared and pass through.
 */
export function codeRoute(host: string, pathname: string, search: string):
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | null {
  const isCodePath = pathname === "/code" || pathname.startsWith("/code/")
  if (isCodeHost(host)) {
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || SHARED_FILES.test(pathname)) return null
    if (isCodePath) return { kind: "redirect", url: `${CODE_ORIGIN}${pathname.slice(5) || "/"}${search}` }
    return { kind: "rewrite", pathname: `/code${pathname === "/" ? "" : pathname}` }
  }
  if (isMainHost(host) && isCodePath) return { kind: "redirect", url: `${CODE_ORIGIN}${pathname.slice(5) || "/"}${search}` }
  return null
}
