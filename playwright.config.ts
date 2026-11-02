import { defineConfig, devices } from "@playwright/test"

// Smoke tests against a production build: `pnpm build && pnpm test:e2e`.
// Set E2E_BASE_URL to test a running site instead (e.g. https://krpex.in); then no server is started.
const PORT = 3100
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: "**/signed-in/**", // run with playwright.signed-in.config.ts (local Supabase + fake AI)
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: `pnpm exec next start -p ${PORT}`, url: `${baseURL}/api/health`, timeout: 120_000, reuseExistingServer: false },
})
