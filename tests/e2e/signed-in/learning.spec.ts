import { execFileSync } from "node:child_process"

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

/** On a lesson page that hasn't been written yet: write it, work through the lecture and pass the quiz. */
async function teachAndPassLesson(page: Page) {
  // The lesson streams in, then the class starts.
  // If the refresh is dropped, the page reloads itself after 4 s, so allow for that.
  await page.getByRole("button", { name: "Start the class" }).first().click() // shown above and below the draft
  await expect(page.getByText(/^Section 1 of \d+$/)).toBeVisible({ timeout: 12_000 })

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
}

/** Answer every question of a module test or final exam with the right (or a wrong) option. */
async function answerAll(page: Page, text: "The right answer" | "A wrong answer") {
  const options = page.getByRole("radio", { name: text, exact: true })
  await expect(options.first()).toBeVisible({ timeout: 60_000 }) // the test is written on first open
  const n = await options.count()
  // Click again if a click landed before the page was ready (e.g. while hydrating) and didn't register.
  for (let i = 0; i < n; i++) {
    await expect(async () => {
      await options.nth(i).click()
      await expect(options.nth(i)).toBeChecked({ timeout: 1000 })
    }).toPass({ timeout: 15_000 })
  }
  await expect(page.getByText(`${n} of ${n} answered`)).toBeVisible()
  return n
}

/** Run SQL as the database owner in the local test Supabase (never the live one; see playwright.signed-in.config.ts). */
function localSql(statement: string) {
  execFileSync("docker", ["exec", "supabase_db_krpex-e2e", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", statement], { stdio: "pipe" })
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

  await teachAndPassLesson(page)
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

test("module tests and the final exam lead to a certificate (Pro)", async ({ page, browser }) => {
  test.setTimeout(240_000)
  const errors = watchErrors(page)
  await page.goto(coursePath)
  await expect(page.getByText("Pass every lesson above to unlock").first()).toBeVisible()
  await expect(page.getByText(/Locked · 0 of 2 module tests passed/)).toBeVisible()

  // Finish module 1, then take its test straight from the lesson.
  await page.getByRole("link", { name: /Second steps/ }).click()
  await teachAndPassLesson(page)
  await page.getByRole("link", { name: "Take the module test" }).click()
  await expect(page.getByRole("heading", { name: "Module test: Getting started" })).toBeVisible()
  expect(await answerAll(page, "The right answer")).toBe(8)
  await page.getByRole("button", { name: "Submit answers" }).click()
  await expect(page.getByText(/You scored 100% \(8 of 8\)\. Module test passed!/)).toBeVisible()
  await expect(page.getByText("The first option is right in every fake question.").first()).toBeVisible()

  // Module 2 has one lesson; passing its test opens the final exam.
  await page.goto(coursePath)
  await page.getByRole("link", { name: /A small project/ }).click()
  await teachAndPassLesson(page)
  await page.getByRole("link", { name: "Take the module test" }).click()
  await answerAll(page, "The right answer")
  await page.getByRole("button", { name: "Submit answers" }).click()
  await page.getByRole("link", { name: "Take the final exam →" }).click()

  // Final exam: a failed try shows only right/wrong (no answers); a second try today is allowed.
  await expect(page.getByRole("heading", { name: /^Final exam:/ })).toBeVisible()
  expect(await answerAll(page, "A wrong answer")).toBe(20)
  await page.getByRole("button", { name: "Submit answers" }).click()
  await expect(page.getByText("You need 70% to pass.")).toBeVisible()
  await expect(page.getByText("The first option is right in every fake question.")).toHaveCount(0)
  await page.getByRole("button", { name: "Try again" }).click()
  await answerAll(page, "The right answer")
  await page.getByRole("button", { name: "Submit answers" }).click()
  await expect(page.getByText("You passed the final exam!")).toBeVisible()

  // Free plan: no certificate, but the result is kept.
  await expect(page.getByText(/Certificates are part of Pro/)).toBeVisible()

  // As Pro (set directly in the local test database), claim it.
  localSql(`insert into public.user_plans (user_id, plan, status, current_period_end)
    select id, 'pro', 'active', now() + interval '30 days' from auth.users where email like 'learner-%' order by created_at desc limit 1`)
  await page.reload()
  await expect(page.getByLabel("Name on certificate")).toHaveValue("Test Learner")
  await page.getByRole("button", { name: "Get my certificate" }).click()
  await expect(page).toHaveURL(/\/certificate\/[0-9A-F]{12}$/)
  const cert = page.getByRole("article", { name: "Certificate of completion" })
  await expect(cert.getByRole("heading", { name: "Certificate of Completion" })).toBeVisible()
  await expect(cert.getByText("Test Learner", { exact: true })).toBeVisible()
  await expect(cert.getByText("Test Course From Fake AI", { exact: true })).toBeVisible()
  await expect(cert.getByText(/Taught by an AI professor/)).toBeVisible()
  const certUrl = page.url()

  // Anyone with the link can check it.
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const anon = await visitor.newPage()
  await anon.goto(certUrl)
  await expect(anon.getByRole("article", { name: "Certificate of completion" }).getByText("Test Learner", { exact: true })).toBeVisible()
  await visitor.close()

  // The course page and account page link to it.
  await page.goto(coursePath)
  await expect(page.getByText(/Passed · 100%/).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "View certificate" })).toBeVisible()
  expect(errors).toEqual([])
})
