import { expect, test } from "@playwright/test"

// Krpex Code (5.4) and Community (5.6) for signed-out visitors. On krpex.in, /code moves to code.krpex.in; anywhere
// else (CI) the pages are served under /code and /community. During the closed beta (plan.md "Closed beta") only
// their home pages and the community guidelines are public; everything else sends visitors to krpex.in/beta.
// The pages themselves are tested signed in (tests/e2e/signed-in/code.spec.ts).
const live = /krpex\.in/.test(process.env.E2E_BASE_URL ?? "")
const code = live ? "https://code.krpex.in" : "/code"
const community = live ? "https://community.krpex.in" : "/community"
const beta = (from: string) => new RegExp(`${live ? "^https://krpex\\.in" : ""}/beta\\?from=${encodeURIComponent(from).replace(/[/]/g, "%2F")}$`)

test("krpex.in/code moves to code.krpex.in", async ({ request }) => {
  test.skip(!live, "only on the live site")
  const res = await request.get("/code/playground?x=1", { maxRedirects: 0 })
  expect(res.status()).toBe(308)
  expect(res.headers().location).toBe("https://code.krpex.in/playground?x=1")
})

test("Krpex Code: the home page is public and asks visitors to apply; the rest is for beta testers", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(code)
  await expect(page.getByRole("heading", { name: /practise coding/i })).toBeVisible()
  await page.getByRole("link", { name: "Apply for the beta" }).click()
  await expect(page).toHaveURL(beta("/code/problems"))
  await expect(page.getByRole("heading", { name: "Help us build Krpex" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", `/create-account?next=${encodeURIComponent("/beta?from=%2Fcode%2Fproblems")}`)

  for (const [path, from] of [
    ["/problems", "/code/problems"],
    ["/plans", "/code/plans"],
    ["/plans/python-basics-30", "/code/plans"],
    ["/playground", "/code/playground"],
    ["/p/two-sum", "/code/problems"],
  ]) {
    await page.goto(`${code}${path}`)
    await expect(page).toHaveURL(beta(from))
  }
  const sitemap = await (await request.get(`${code}/sitemap.xml`)).text()
  expect(sitemap).toContain("<loc>https://code.krpex.in/</loc>")
  expect(sitemap).not.toContain("/problems")
  expect(errors).toEqual([])
})

test("Krpex Community: the home page and guidelines are public; reading is for beta testers", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(`${community}/`)
  await expect(page.getByRole("heading", { name: "Learn together" })).toBeVisible()
  await expect(page.getByRole("heading", { name: /^Latest discussions/ })).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Apply for the beta" })).toBeVisible()
  await page.getByRole("link", { name: "Community guidelines" }).click()
  await expect(page.getByRole("heading", { name: "Community guidelines", level: 1 })).toBeVisible()

  for (const [path, from] of [
    ["/c", "/community/c"],
    ["/c/help", "/community/c"],
    ["/p/two-sum", "/community"],
    ["/p/two-sum/discuss", "/community"],
    ["/u/nobody_has_this_handle", "/community"],
  ]) {
    await page.goto(`${community}${path}`)
    await expect(page).toHaveURL(beta(from))
  }

  // Old Code profile links still move to Community (which then asks to apply).
  const old = await request.get(`${code}/u/Some_One`, { maxRedirects: 0 })
  expect(old.status()).toBe(308)
  expect(old.headers().location).toBe(live ? "https://community.krpex.in/u/some_one" : "/community/u/some_one")
  const sitemap = await (await request.get(`${community}/sitemap.xml`)).text()
  expect(sitemap).toContain("https://community.krpex.in/guidelines</loc>")
  expect(sitemap).not.toContain("/c/")
  expect(sitemap).not.toContain("/u/")
  const robots = await request.get(`${community}/robots.txt`)
  expect(await robots.text()).toContain("Sitemap: https://community.krpex.in/sitemap.xml")
  if (live) {
    const moved = await request.get("https://krpex.in/community/guidelines", { maxRedirects: 0 })
    expect(moved.status()).toBe(308)
    expect(moved.headers().location).toBe("https://community.krpex.in/guidelines")
  }
  expect(errors).toEqual([])
})
