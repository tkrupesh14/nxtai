/** Only allow same-site relative paths ("/learn"), never "//host" or "/\host" which browsers treat as another site. */
export function safeNext(next: string | null | undefined, fallback = "/learn") {
  return next && /^\/(?![\/\\])/.test(next) && !/[\r\n]/.test(next) ? next : fallback
}
