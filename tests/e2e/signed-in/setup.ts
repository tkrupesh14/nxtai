import { expect, test as setup } from "@playwright/test"

// Signs up a new learner through the real form (email confirmation is off in the local Supabase) and saves the
// session for the other signed-in tests.
setup("sign up a new learner", async ({ page }) => {
  await page.goto("/create-account")
  await page.getByLabel("Your name").fill("Test Learner")
  await page.getByLabel("Email").fill(`learner-${Date.now()}@example.com`)
  await page.getByLabel("Password", { exact: true }).fill("testpass123")
  await page.getByRole("button", { name: "Create account" }).click()
  // New accounts go straight to onboarding.
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByText("What would you like to learn?")).toBeVisible()
  await page.context().storageState({ path: "test-results/.auth/learner.json" })
})
