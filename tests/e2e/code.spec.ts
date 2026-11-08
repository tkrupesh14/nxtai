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
  test.setTimeout(120_000)
  const base = live ? "https://code.krpex.in" : "/code"
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(base)
  await expect(page.getByRole("heading", { name: /practise coding/i })).toBeVisible()
  await page.goto(`${base}/playground`)

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

test("a problem checks examples, then all tests on submit", async ({ page }) => {
  test.setTimeout(120_000)
  const base = live ? "https://code.krpex.in" : "/code"
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  // A solution waiting as an unsaved draft in this browser (typing into the editor isn't what's tested here).
  await page.addInitScript(() => {
    localStorage.setItem("krpex-code:lang", "javascript")
    localStorage.setItem(
      "krpex-code:p:two-sum:javascript",
      "function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++)\n    for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === target) return [i, j]\n}\n",
    )
  })
  await page.goto(`${base}/problems`)
  await expect(page.getByRole("heading", { name: "Practice problems" })).toBeVisible()
  await page.getByRole("link", { name: /^Two sum/ }).click()
  await expect(page.getByRole("heading", { name: "Two sum" })).toBeVisible()

  await page.getByRole("button", { name: /Run examples/ }).click()
  await expect(page.getByText("2 of 2 examples passed")).toBeVisible({ timeout: 30_000 })
  await page.getByRole("button", { name: "Submit" }).click()
  await expect(page.getByText("5 of 5 tests passed")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/to save your solutions and earn XP/)).toBeVisible()

  // A wrong answer in Python shows what came back.
  await page.getByRole("tab", { name: "Python" }).click()
  await page.evaluate(() => localStorage.setItem("krpex-code:lang", "python"))
  await page.getByRole("button", { name: /Run examples/ }).click()
  await expect(page.getByText("0 of 2 examples passed")).toBeVisible({ timeout: 90_000 })
  await expect(page.getByText("None").first()).toBeVisible()
  expect(errors).toEqual([])
})
