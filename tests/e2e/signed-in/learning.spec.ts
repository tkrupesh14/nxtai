import { expect, test, type Page } from "@playwright/test"

// The main learner journey, in order, as one signed-in learner (see setup.ts). Runs against a local Supabase and
// the fake AI (tests/support/fake-ai.mjs), whose answer to every question is the first option.
test.describe.configure({ mode: "serial" })

const UUID = "[0-9a-f-]{36}"
let coursePath = ""

/** Fail on browser errors or server errors. */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`))
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`)
  })
  return errors
}

test("onboarding builds a course", async ({ page }) => {
  const errors = watchErrors(page)
  // No courses yet: My courses sends a new learner to onboarding.
  await page.goto("/learn")
  await expect(page).toHaveURL(/\/onboarding$/)

  await page.getByRole("button", { name: /Coding & Software/ }).click()
  await page.getByRole("radio", { name: "Python" }).click()
  await page.getByLabel("What do you want to learn or achieve?").fill("Learn Python to automate my spreadsheets")
  await page.getByLabel("Completely new to it").check()
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Build my course" }).click()

  await expect(page).toHaveURL(new RegExp(`/learn/${UUID}$`))
  await expect(page.getByRole("heading", { name: "Test Course From Fake AI" })).toBeVisible()
  await expect(page.getByText("First steps")).toBeVisible()
  coursePath = new URL(page.url()).pathname
  expect(errors).toEqual([])
})

test("a lesson is written, taught and passed", async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto(coursePath)
  await page.getByRole("link", { name: "Start first lesson" }).click()
  await expect(page).toHaveURL(new RegExp(`/learn/${UUID}/${UUID}$`))

  // The lesson streams in, then the class starts.
  const after: string[] = []
  page.on("response", (r) => after.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, "")} rsc=${r.request().headers()["rsc"] ?? "-"}`))
  page.on("console", (m) => after.push(`console.${m.type()}: ${m.text().slice(0, 200)}`))
  await page.getByRole("button", { name: "Start the class" }).first().click() // shown above and below the draft
  const section1 = page.getByText(/^Section 1 of \d+$/)
  try {
    await expect(section1).toBeVisible({ timeout: 8000 })
  } catch {
    // TEMP diagnostics: what happened after the click, and does a reload show the saved lesson?
    await page.reload()
    const afterReload = await section1.isVisible({ timeout: 8000 }).catch(() => false)
    throw new Error(`lecture did not appear after "Start the class". Visible after reload: ${afterReload}\n${after.join("\n")}`)
  }

  // Work through the lecture; the practice question must be answered before "Continue" works again.
  const submit = page.getByRole("button", { name: "Submit answers" })
  const next = page.getByRole("button", { name: "Continue", exact: true })
  for (let i = 0; i < 20; i++) {
    await expect(submit.or(next).first()).toBeVisible()
    if (await submit.isVisible()) break
    const check = page.getByRole("button", { name: "Check my answer" })
    if (await check.isVisible()) {
      await page.getByRole("group", { name: "Practice question" }).getByText("The right answer").click()
      await check.click()
      await expect(page.getByText("Exactly right.")).toBeVisible()
    }
    await next.click()
  }
  await expect(page.getByText("Key takeaways")).toBeVisible()
  await expect(page.getByText("Fake takeaway one")).toBeVisible()

  // Quiz: graded in the database. The fake AI's answers are always the first option.
  const quiz = page.locator("section").filter({ has: submit }).last()
  const right = quiz.getByText("The right answer")
  for (let i = 0; i < (await right.count()); i++) await right.nth(i).click()
  await submit.click()
  await expect(page.getByText("You scored 100%. Lesson complete!")).toBeVisible()
  await expect(page.getByRole("link", { name: "Next lesson →" })).toBeVisible()

  // No sideways scrolling.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  expect(errors).toEqual([])
})

test("the AI professor answers a question about the lesson", async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto(coursePath)
  await page.getByRole("link", { name: /First steps/ }).first().click()
  await page.getByRole("button", { name: /Ask about this section/ }).first().click()
  await page.getByLabel("Your question").fill("What is a list?")
  await page.getByRole("button", { name: "Ask", exact: true }).click()
  await expect(page.getByText("Fake professor answer to: What is a list?")).toBeVisible()
  // Labelled as an AI professor, never as a human.
  await expect(page.getByText(/AI professor · answers about this lesson/).first()).toBeVisible()
  expect(errors).toEqual([])
})

test("My courses shows progress and where to continue", async ({ page }) => {
  await page.goto("/learn")
  await expect(page.getByRole("heading", { name: "My courses" })).toBeVisible()
  const progress = page.getByRole("region", { name: "Your progress" })
  await expect(progress.getByText("1 day")).toBeVisible()
  await expect(progress.getByText("Lessons completed", { exact: true }).locator("..")).toContainText("1")
  await expect(page.getByRole("link", { name: "Continue: Second steps" })).toBeVisible()
})

test("catalog courses start in one tap and count toward the free allowance", async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto("/courses/python-fundamentals")
  await page.getByRole("button", { name: "Start this course" }).click()
  await expect(page).toHaveURL(new RegExp(`/learn/${UUID}$`))
  await expect(page.getByRole("heading", { name: /Python/ }).first()).toBeVisible()
  const catalogPath = new URL(page.url()).pathname

  // Starting it again opens the same copy.
  await page.goto("/courses/python-fundamentals")
  await page.getByRole("button", { name: "Start this course" }).click()
  await expect(page).toHaveURL(new RegExp(`${catalogPath}$`))

  // Free plan: 2 new courses a month, so a third is refused (no credits yet).
  await page.goto("/courses/sql-from-zero")
  await page.getByRole("button", { name: "Start this course" }).click()
  await expect(page.getByText(/You've used this month's free courses/)).toBeVisible()
  expect(errors).toEqual([])

  // Delete the catalog course.
  await page.goto(catalogPath)
  await page.getByRole("button", { name: "Delete course…" }).click()
  await page.getByRole("button", { name: "Yes, delete it" }).click()
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole("link", { name: "Test Course From Fake AI" }).first()).toBeVisible()
  // (Python Fundamentals may still be offered as a suggestion; the learner's copy is gone.)
  await expect(page.locator(`a[href^="${catalogPath}"]`)).toHaveCount(0)
})

test("account page shows the plan and credits", async ({ page }) => {
  await page.goto("/account")
  await expect(page.getByText(/Credits:/).first()).toBeVisible()
  await expect(page.getByText("Plan & credits").first()).toBeVisible()
})
