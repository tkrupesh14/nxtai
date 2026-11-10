import { expect, test } from "@playwright/test"

// Community 5a: claim a handle, make the profile public, view it, then make it private again (local Supabase only).

test("a learner claims a handle, shares a public profile and can hide it again", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto("/account")
  const section = page.locator("#public-profile")
  await section.getByLabel("Handle").fill("Admin")
  await expect(section.getByText("That handle is reserved. Please pick another.")).toBeVisible()
  await expect(section.getByRole("button", { name: "Claim handle" })).toBeDisabled()

  await section.getByLabel("Handle").fill("E2E_Learner")
  await section.getByLabel("Bio (optional)").fill("see www.spam.example")
  await section.getByLabel(/Make my profile public/).check()
  await section.getByRole("button", { name: "Claim handle" }).click()
  await expect(section.getByText("Links in your name or bio unlock at level 4.")).toBeVisible()

  await section.getByLabel("Bio (optional)").fill("Learning Python on Krpex")
  await section.getByRole("button", { name: "Claim handle" }).click()
  await expect(section.getByText("Saved. Your profile is public.")).toBeVisible()
  await section.getByRole("link", { name: "View your public profile" }).click()

  await expect(page).toHaveURL(/\/code\/u\/e2e_learner$/)
  await expect(page.getByText("@e2e_learner")).toBeVisible()
  await expect(page.getByText("Learning Python on Krpex")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Study plans finished" })).toBeVisible()
  await expect(page.getByText("Recently solved")).toHaveCount(0)
  await expect(page.locator("body")).not.toContainText("@example.com")

  await page.goto("/account")
  await section.getByLabel(/Make my profile public/).uncheck()
  await section.getByRole("button", { name: "Save profile" }).click()
  await expect(section.getByText("Saved. Your profile is private.")).toBeVisible()
  const res = await page.goto("/code/u/e2e_learner")
  expect(res?.status()).toBe(404)
  expect(errors).toEqual([])
})
