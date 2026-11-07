import { expect, test } from "@playwright/test"

// Krpex Code (5.4). On krpex.in, /code moves to code.krpex.in; anywhere else (CI) the pages are served under /code.
const live = /krpex\.in/.test(process.env.E2E_BASE_URL ?? "")

test("krpex.in/code moves to code.krpex.in", async ({ request }) => {
  test.skip(!live, "only on the live site")
  const res = await request.get("/code/playground?x=1", { maxRedirects: 0 })
  expect(res.status()).toBe(308)
  expect(res.headers().location).toBe("https://code.krpex.in/playground?x=1")
})

test("the playground runs JavaScript and Python in the browser", async ({ page }) => {
  test.skip(live, "the subdomain is checked separately")
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/code")
  await expect(page.getByRole("heading", { name: /practise coding/i })).toBeVisible()
  await page.goto("/code/playground")

  const output = page.getByRole("region", { name: "Output" })
  await page.getByRole("tab", { name: "JavaScript" }).click()
  await page.getByRole("button", { name: /run/i }).click()
  await expect(output).toContainText("Hello, Asha!")
  await expect(output).toContainText("Squares:")

  await page.getByRole("tab", { name: "Python" }).click()
  await page.getByRole("button", { name: /run/i }).click()
  await expect(output).toContainText("Hello, Asha!", { timeout: 90_000 })
  await expect(output).toContainText("[1, 4, 9, 16, 25]")
  expect(errors).toEqual([])
})
