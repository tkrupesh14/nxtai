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

test("the problem set filters, and a problem runs custom cases, then submits", async ({ page, isMobile }) => {
  test.setTimeout(150_000)
  const base = live ? "https://code.krpex.in" : "/code"
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  // A solution waiting as an unsaved draft in this browser (typing into the editor isn't what's tested here).
  await page.addInitScript(() => {
    if (window !== window.top) return // the sandboxed runner frame has no storage
    localStorage.setItem("krpex-code:lang", "javascript")
    localStorage.setItem(
      "krpex-code:p:two-sum:javascript",
      "function twoSum(nums, target) {\n  console.log('size', nums.length)\n  for (let i = 0; i < nums.length; i++)\n    for (let j = i + 1; j < nums.length; j++) if (nums[i] + nums[j] === target) return [i, j]\n}\n",
    )
  })
  await page.goto(`${base}/problems`)
  await expect(page.getByRole("heading", { name: "Problems", exact: true })).toBeVisible()
  await page.getByRole("searchbox", { name: "Search problems" }).fill("two sum")
  await expect(page.getByText("1 of 150 problems")).toBeVisible()
  await page.getByRole("link", { name: /^\d+\. Two sum$/ }).click()
  await expect(page.getByRole("heading", { name: /^\d+\. Two sum$/ })).toBeVisible()

  // Run the examples, plus one case of our own: its expected answer comes from the server.
  const run = page.getByRole("button", { name: "Run", exact: true })
  await run.click()
  await expect(page.getByRole("heading", { name: "Accepted" })).toBeVisible({ timeout: 30_000 })
  await page.getByRole("tab", { name: "Testcase" }).click()
  await page.getByRole("button", { name: "Add a test case" }).click()
  await page.getByRole("textbox", { name: "nums =" }).fill("[5, 1, 4]")
  await page.getByRole("textbox", { name: "target =" }).fill("6")
  await run.click()
  // Result chips say whether each case passed (the Testcase tab's chips don't).
  await page.getByRole("button", { name: "Case 3 (passed)" }).click({ timeout: 30_000 })
  const console_ = page.getByRole("region", { name: "Test cases" })
  await expect(console_.getByText("[0,1]")).toHaveCount(2) // output and expected
  await expect(console_.getByText("size 3")).toBeVisible()

  // Submit runs every test; signed out, nothing is saved.
  await page.getByRole("button", { name: "Submit" }).click()
  const problem = page.getByRole("region", { name: "Problem" })
  await expect(problem.getByRole("heading", { name: "Accepted" })).toBeVisible({ timeout: 30_000 })
  await expect(problem.getByText("5 / 5 tests passed")).toBeVisible()
  await expect(problem.getByText(/to save your solutions and earn XP/)).toBeVisible()

  // The Python starting code gives a wrong answer and shows what came back.
  if (isMobile) await page.getByRole("tab", { name: "Code" }).click()
  await page.getByRole("combobox", { name: "Language" }).selectOption("python")
  await run.click()
  await expect(page.getByRole("heading", { name: "Wrong answer" })).toBeVisible({ timeout: 90_000 })
  await expect(console_.getByText("None").first()).toBeVisible()
  expect(errors).toEqual([])
})

test("study plans list their problems, and a problem opened from a plan follows the plan", async ({ page }) => {
  const base = live ? "https://code.krpex.in" : "/code"
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(`${base}/plans`)
  await expect(page.getByRole("heading", { name: "Study plans", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5)
  await page.getByRole("link", { name: /Python basics in 30 days/ }).click()

  await expect(page.getByRole("heading", { name: "Python basics in 30 days" })).toBeVisible()
  await expect(page.getByText("Day 30", { exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Log in to follow" })).toBeVisible()
  await page.getByRole("link", { name: "Start" }).click()

  await expect(page).toHaveURL(/\/p\/add-two-numbers\?plan=python-basics-30$/)
  await expect(page.getByRole("button", { name: "Problem list: Python basics in 30 days" })).toBeVisible()
  await page.getByRole("link", { name: /^Next: Even or odd$/ }).click()
  await expect(page).toHaveURL(/\/p\/even-or-odd\?plan=python-basics-30$/)
  await expect(page.getByRole("link", { name: /^Next: Largest of three$/ })).toBeVisible()
  expect(errors).toEqual([])
})
