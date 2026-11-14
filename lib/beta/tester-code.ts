// The anonymous code a beta tester's session recordings carry (B.4): "t-" and the first 10 hex characters of the
// SHA-256 of their account id. The same in the browser (Web Crypto) and on the admin pages (testerCodeSync).

export async function testerCode(userId: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId))
  return `t-${Array.from(new Uint8Array(hash).slice(0, 5), (b) => b.toString(16).padStart(2, "0")).join("")}`
}
