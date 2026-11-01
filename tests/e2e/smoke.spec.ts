import { expect, test, type Page } from "@playwright/test"

/** Fail the test on any browser error or failed same-site request. */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`)
  })
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`)
  })
  return errors
}

const PUBLIC_PAGES = [
  ["/", /personal AI professor/i],
  ["/pricing", /₹499/],
  ["/about", /Krpex/],
  ["/contact", /contact/i],
  ["/terms", /terms/i],
  ["/privacy", /privacy/i],
  ["/refund-policy", /refund/i],
  ["/login", /log in/i],
  ["/create-account", /create/i],
] as const

for (const [path, text] of PUBLIC_PAGES) {
  test(`public page ${path} loads cleanly`, async ({ page }) => {
    const errors = watchErrors(page)
    const res = await page.goto(path)
    expect(res?.status()).toBe(200)
    await expect(page.locator("body")).toContainText(text)
    await expect(page).toHaveTitle(/Krpex/)
    // Nothing wider than the screen (no sideways scrolling on phones).
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    expect(errors).toEqual([])
  })
}

test("signed-out visitors are sent to log in", async ({ page }) => {
  for (const path of ["/learn", "/account", "/admin", "/onboarding"]) {
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/[/]/g, "%2F")}`))
  }
})

test("the old dashboard redirects to My courses", async ({ request }) => {
  for (const path of ["/dashboard", "/dashboard/analytics"]) {
    const res = await request.get(path, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers().location).toMatch(/\/learn$/)
  }
})

test("login rejects open redirects", async ({ page }) => {
  await page.goto("/login?next=//evil.example")
  await expect(page.locator('a[href*="evil.example"]')).toHaveCount(0)
})

test("health check answers", async ({ request }) => {
  const res = await request.get("/api/health")
  const body = await res.json()
  expect(["ok", "degraded"]).toContain(body.status)
  expect(res.headers()["cache-control"]).toContain("no-store")
})

test("API routes refuse bad input without crashing", async ({ request }) => {
  const stream = await request.post("/api/lessons/stream", { data: { courseId: "x", lessonId: "y" } })
  expect(stream.status()).toBeLessThan(500)
  const hook = await request.post("/api/razorpay/webhook", { data: "{}", headers: { "x-razorpay-signature": "bad" } })
  expect(hook.status()).toBeGreaterThanOrEqual(400)
  expect(hook.status()).toBeLessThan(500)
})
