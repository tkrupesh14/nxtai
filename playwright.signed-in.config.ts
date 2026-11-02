import { defineConfig, devices } from "@playwright/test"

// Signed-in browser tests: a real production build against a LOCAL Supabase (`supabase start`) and a fake AI
// server (tests/support/fake-ai.mjs). Never point this at the live database: it creates accounts and courses.
//   supabase start && pnpm build (with the local env below) && pnpm test:e2e:signed-in
// Needs NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from `supabase status`, SERVER_RPC_KEY=e2e-server-key,
// OPENROUTER_API_KEY=fake and AI_BASE_URL=http://127.0.0.1:3199/v1 (the CI job sets these).
const PORT = 3100
const baseURL = `http://127.0.0.1:${PORT}`

if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("Signed-in tests must run against a local Supabase (NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321).")
}

export default defineConfig({
  testDir: "tests/e2e/signed-in",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // One learner's journey in order: a retry would start from a half-finished state, so no retries.
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "setup", testMatch: /setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "signed-in",
      testMatch: /\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "test-results/.auth/learner.json" },
    },
  ],
  webServer: [
    { command: "node tests/support/fake-ai.mjs 3199", url: "http://127.0.0.1:3199/", reuseExistingServer: false },
    {
      // Server output also goes to e2e-server.log (CI shows its tail when a test fails).
      command: `pnpm exec next start -p ${PORT} 2>&1 | tee e2e-server.log`,
      url: `${baseURL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
