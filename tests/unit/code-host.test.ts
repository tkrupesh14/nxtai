import { NextRequest, NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import { authCookieDomain, codeHref, codeRoute, communityHref, mainHref } from "@/lib/code-host"
import { SHARED_AUTH_MARK, shareAuthCookies } from "@/lib/supabase/middleware"

describe("code.krpex.in routing", () => {
  it("maps subdomain paths onto /code and keeps API routes and shared files", () => {
    expect(codeRoute("code.krpex.in", "/", "")).toEqual({ kind: "rewrite", pathname: "/code" })
    expect(codeRoute("code.krpex.in", "/playground", "")).toEqual({ kind: "rewrite", pathname: "/code/playground" })
    expect(codeRoute("code.krpex.in", "/api/code/run", "")).toBeNull()
    expect(codeRoute("code.krpex.in", "/manifest.webmanifest", "")).toBeNull()
    expect(codeRoute("code.krpex.in", "/code/playground", "?a=1")).toEqual({ kind: "redirect", url: "https://code.krpex.in/playground?a=1" })
  })

  it("next.config.mjs rewrites the subdomain the same way as codeRoute()", async () => {
    // @ts-expect-error Next's bundled copy has no types
    const ptr = await import("next/dist/compiled/path-to-regexp")
    const { compile, pathToRegexp } = ptr as {
      pathToRegexp: (s: string, keys: { name: string; modifier: string }[]) => RegExp
      compile: (s: string, o: object) => (p: object) => string
    }
    const config = (await import("../../next.config.mjs")).default
    const { beforeFiles } = (await config.rewrites!()) as { beforeFiles: { source: string; destination: string; has: unknown }[] }
    const rewrite = (host: string, path: string) => {
      for (const r of beforeFiles) {
        if (JSON.stringify(r.has) !== JSON.stringify([{ type: "host", value: host }])) continue
        const keys: { name: string; modifier: string }[] = []
        const m = pathToRegexp(r.source, keys).exec(path)
        if (!m) continue
        const params = Object.fromEntries(keys.map((k, i) => [k.name, k.modifier === "*" ? m[i + 1]?.split("/") : m[i + 1]]))
        return compile(r.destination, { validate: false })(params)
      }
      return null
    }
    expect(beforeFiles.every((r) => ["code.krpex.in", "community.krpex.in"].includes((r.has as { value: string }[])[0].value))).toBe(true)
    for (const host of ["code.krpex.in", "community.krpex.in"])
      for (const path of ["/", "/playground", "/p/two-sum", "/u/asha", "/robots.txt", "/sitemap.xml", "/api/health", "/api/code/run",
        "/_next/static/x.js", "/manifest.webmanifest", "/icon.svg", "/apple-icon", "/apple-icon.png", "/favicon.ico",
        "/code-runner.html", "/coder", "/apix", "/communityx"]) {
        const route = codeRoute(host, path, "")
        expect(rewrite(host, path), `${host}${path}`).toBe(route?.kind === "rewrite" ? route.pathname : null)
      }
  })

  it("serves community.krpex.in from /community and sends each prefix to its own subdomain", () => {
    expect(codeRoute("community.krpex.in", "/", "")).toEqual({ kind: "rewrite", pathname: "/community" })
    expect(codeRoute("community.krpex.in", "/u/asha", "")).toEqual({ kind: "rewrite", pathname: "/community/u/asha" })
    expect(codeRoute("community.krpex.in", "/api/health", "")).toBeNull()
    expect(codeRoute("community.krpex.in", "/community/u/asha", "?x=1")).toEqual({ kind: "redirect", url: "https://community.krpex.in/u/asha?x=1" })
    expect(codeRoute("community.krpex.in", "/code/p/two-sum", "")).toEqual({ kind: "redirect", url: "https://code.krpex.in/p/two-sum" })
    expect(codeRoute("code.krpex.in", "/community", "")).toEqual({ kind: "redirect", url: "https://community.krpex.in/" })
    expect(codeRoute("krpex.in", "/community/guidelines", "")).toEqual({ kind: "redirect", url: "https://community.krpex.in/guidelines" })
    expect(codeRoute("localhost", "/community/u/asha", "")).toBeNull()
    expect(communityHref("/u/asha", "community.krpex.in")).toBe("/u/asha")
    expect(communityHref("/u/asha", "code.krpex.in")).toBe("https://community.krpex.in/u/asha")
    expect(communityHref("/", "krpex.in")).toBe("/community")
    expect(codeHref("/problems", "community.krpex.in")).toBe("https://code.krpex.in/problems")
    expect(mainHref("/learn", "community.krpex.in")).toBe("https://krpex.in/learn")
    expect(authCookieDomain("community.krpex.in")).toBe(".krpex.in")
  })

  it("sends krpex.in/code to the subdomain, but serves /code directly elsewhere", () => {
    expect(codeRoute("krpex.in", "/code", "")).toEqual({ kind: "redirect", url: "https://code.krpex.in/" })
    expect(codeRoute("www.krpex.in", "/code/p/two-sum", "")).toEqual({ kind: "redirect", url: "https://code.krpex.in/p/two-sum" })
    expect(codeRoute("krpex.in", "/codes", "")).toBeNull()
    expect(codeRoute("krpex.in", "/learn", "")).toBeNull()
    expect(codeRoute("localhost", "/code/playground", "")).toBeNull()
  })

  it("builds links for either host", () => {
    expect(codeHref("/playground", "code.krpex.in")).toBe("/playground")
    expect(codeHref("/", "code.krpex.in")).toBe("/")
    expect(codeHref("/playground", "localhost:3000")).toBe("/code/playground")
    expect(codeHref("/", "localhost")).toBe("/code")
    expect(mainHref("/learn", "code.krpex.in")).toBe("https://krpex.in/learn")
    expect(mainHref("/learn", "localhost")).toBe("/learn")
  })

  it("shares sign-in cookies only on krpex.in hosts", () => {
    expect(authCookieDomain("krpex.in")).toBe(".krpex.in")
    expect(authCookieDomain("code.krpex.in:443")).toBe(".krpex.in")
    expect(authCookieDomain("localhost:3000")).toBeUndefined()
    expect(authCookieDomain("evilkrpex.in")).toBeUndefined()
  })
})

const req = (cookie: string, host = "krpex.in") =>
  new NextRequest("http://localhost:3000/learn", { headers: { cookie, host, "x-forwarded-host": host } })

describe("moving sign-in cookies to .krpex.in", () => {
  it("copies each Supabase cookie to the shared domain and deletes the old host-only one, once", () => {
    const res = shareAuthCookies(req("sb-abc-auth-token.0=AAA; sb-abc-auth-token.1=BBB; other=1"), NextResponse.next())
    const set = res.headers.getSetCookie()
    expect(set.filter((c) => /Domain=\.krpex\.in/i.test(c)).map((c) => c.split(";")[0])).toEqual([
      "sb-abc-auth-token.0=AAA",
      "sb-abc-auth-token.1=BBB",
      `${SHARED_AUTH_MARK}=1`,
    ])
    expect(set.filter((c) => !/Domain=/i.test(c))).toEqual([
      "sb-abc-auth-token.0=; Path=/; Max-Age=0; SameSite=Lax; Secure",
      "sb-abc-auth-token.1=; Path=/; Max-Age=0; SameSite=Lax; Secure",
    ])
    expect(set.join("\n")).not.toMatch(/^other=/m)

    const again = shareAuthCookies(req(`sb-abc-auth-token.0=AAA; ${SHARED_AUTH_MARK}=1`), NextResponse.next())
    expect(again.headers.getSetCookie()).toEqual([])
  })

  it("keeps a freshly refreshed cookie instead of the old value", () => {
    const res = NextResponse.next()
    res.cookies.set("sb-abc-auth-token", "NEW", { domain: ".krpex.in", path: "/" })
    const set = shareAuthCookies(req("sb-abc-auth-token=OLD"), res).headers.getSetCookie()
    expect(set.filter((c) => c.startsWith("sb-abc-auth-token=") && /Domain/i.test(c))).toEqual([expect.stringContaining("sb-abc-auth-token=NEW")])
    expect(set).toContain("sb-abc-auth-token=; Path=/; Max-Age=0; SameSite=Lax; Secure")
  })

  it("removes a host-only copy that reappears, and does nothing off krpex.in", () => {
    const dup = shareAuthCookies(req(`sb-abc-auth-token=A; sb-abc-auth-token=B; ${SHARED_AUTH_MARK}=1`), NextResponse.next())
    expect(dup.headers.getSetCookie()).toEqual(["sb-abc-auth-token=; Path=/; Max-Age=0; SameSite=Lax; Secure"])
    expect(shareAuthCookies(req("sb-abc-auth-token=A", "localhost:3000"), NextResponse.next()).headers.getSetCookie()).toEqual([])
    expect(shareAuthCookies(req("theme=dark"), NextResponse.next()).headers.getSetCookie()).toEqual([])
  })
})
