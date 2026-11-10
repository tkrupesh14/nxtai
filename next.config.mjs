/** @type {import('next').NextConfig} */
const nextConfig = {
  // scripts/deploy.sh builds into a separate folder, then swaps it in only if the build succeeded.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Old auth pages, replaced by the pages in app/(site).
  async redirects() {
    return [
      { source: "/auth/login", destination: "/login", permanent: true },
      { source: "/auth/signup", destination: "/create-account", permanent: true },
      { source: "/auth/forgot-password", destination: "/forgot-password", permanent: true },
      { source: "/auth/reset-password", destination: "/forgot-password", permanent: true },
      { source: "/auth/confirm-user", destination: "/login", permanent: true },
      { source: "/dashboard/profile", destination: "/account", permanent: false },
      { source: "/dashboard/settings", destination: "/account/settings", permanent: false },
      // The old sample-data dashboard; progress now lives on "My courses".
      { source: "/dashboard", destination: "/learn", permanent: false },
      { source: "/dashboard/:path*", destination: "/learn", permanent: false },
    ]
  },
  // Krpex Code (5.4) and Krpex Community (5.6): code.krpex.in pages live under app/(code)/code, community.krpex.in
  // pages under app/(community)/community. Same mapping as codeRoute() in
  // lib/code-host.ts (tests/unit/code-host.test.ts checks they agree). It is done here, not with a rewrite in
  // proxy.ts: the server listens on 127.0.0.1, which the proxy sees as "localhost", and Next then treats a
  // proxy rewrite as going to another origin and fails trying to fetch it.
  async rewrites() {
    // Each subdomain's paths go under its prefix, except API routes, Next's files, shared root files and the other
    // prefixes (proxy.ts redirects those to their own subdomain first).
    const shared = "(?!(?:api|_next|code|community)(?:/|$)|(?:code-runner\\.html|manifest\\.webmanifest|icon\\.svg|apple-icon|apple-icon\\.png|favicon\\.ico)$)"
    return {
      beforeFiles: [
        ["code.krpex.in", "/code"],
        ["community.krpex.in", "/community"],
      ].flatMap(([host, prefix]) => {
        const has = [{ type: "host", value: host }]
        return [
          { source: "/", has, destination: prefix },
          { source: `/:first(${shared}[^/]+)/:rest*`, has, destination: `${prefix}/:first/:rest*` },
        ]
      }),
    }
  },
  // The 1.8 GB server: one build worker at a time instead of parallel compiles.
  experimental: {
    cpus: 1,
  },
}

export default nextConfig
