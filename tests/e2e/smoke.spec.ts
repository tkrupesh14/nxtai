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
  ["/", /built from a few questions/i],
  ["/pricing", /₹499/],
  ["/courses", /Ready-made courses/],
  ["/courses/python-fundamentals", /Syllabus/],
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

test("starting a ready-made course while signed out goes through sign-up and back", async ({ page }) => {
  await page.goto("/courses/sql-from-zero")
  await page.getByRole("button", { name: "Start this course" }).click()
  await expect(page).toHaveURL(/\/create-account\?next=%2Fcourses%2Fsql-from-zero/)
  await expect(page.getByRole("link", { name: /log in/i }).last()).toHaveAttribute("href", "/login?next=%2Fcourses%2Fsql-from-zero")
})

test("unknown course pages are 404s", async ({ request }) => {
  expect((await request.get("/courses/not-a-course")).status()).toBe(404)
})

test("sitemap lists the course pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text()
  expect(xml).toContain("/courses/python-fundamentals")
})

test("uploads need the Krpex site and a signed-in learner", async ({ request, baseURL }) => {
  const res = await request.post("/api/sources", { multipart: { text: "x".repeat(300) } })
  expect(res.status()).toBe(403)
  const signedOut = await request.post("/api/sources", { multipart: { text: "x".repeat(300) }, headers: { origin: new URL(baseURL!).origin } })
  expect(signedOut.status()).toBe(401)
})
