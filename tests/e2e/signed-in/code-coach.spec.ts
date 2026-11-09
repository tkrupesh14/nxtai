import { expect, test } from "@playwright/test"

// Krpex Code AI coach (v2 Phase 3), signed in, against the local Supabase and the fake AI (tests/support/fake-ai.mjs).
// The fake pastes the reference solution for code containing "GIVE-AWAY"; the coach must never show it.
// A new learner gets 3 free coach answers a day and no credits. Requests must be 5 s apart.

test("the AI coach gives hints in steps, explains a failing test, and stops at the free limit", async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.addInitScript(() => {
    if (window !== window.top) return // the sandboxed runner frame has no storage
    localStorage.setItem("krpex-code:lang", "javascript")
    localStorage.setItem("krpex-code:p:two-sum:javascript", "function twoSum(nums, target) {\n  // GIVE-AWAY\n  return [0, 0]\n}\n")
  })
  await page.goto("/code/p/two-sum")
  await page.getByRole("tab", { name: "Coach" }).click()
  const panel = page.getByRole("region", { name: "Problem" })
  await expect(panel.getByText("3 of 3 free left today")).toBeVisible()
  await expect(panel.getByRole("button", { name: "Review my solution" })).toBeDisabled()
  await expect(panel.getByRole("button", { name: "Explain my failing test" })).toBeDisabled()

  // Hint 1: the fake's first answer gives the code away, so the learner sees the stricter second answer.
  await panel.getByRole("button", { name: "Get a hint (1 of 3)" }).click()
  await expect(panel.getByText("Fake coach (Hint 1 of 3): think about what each step does.")).toBeVisible()
  await expect(panel.getByText("Here's the answer")).toHaveCount(0)
  await expect(panel.getByText("2 of 3 free left today")).toBeVisible()

  // A failing run, explained.
  await page.waitForTimeout(5500)
  await page.getByRole("button", { name: "Run", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Wrong answer" })).toBeVisible({ timeout: 30_000 })
  await panel.getByRole("button", { name: "Explain my failing test" }).click()
  await expect(panel.getByText("about input nums = [2,7,11,15], target = 9")).toBeVisible()

  await page.waitForTimeout(5500)
  await panel.getByRole("button", { name: "Next hint (2 of 3)" }).click()
  await expect(panel.getByText("Fake coach (Hint 2 of 3): think about what each step does.")).toBeVisible()
  await expect(panel.getByText("Free answers used · 1 credit each (0 left)")).toBeVisible()

  await page.waitForTimeout(5500)
  await panel.getByRole("button", { name: "Next hint (3 of 3)" }).click()
  await expect(panel.getByText(/used today's free coach answers/)).toBeVisible()

  // The answers stay with the problem.
  await page.reload()
  await page.getByRole("tab", { name: "Coach" }).click()
  await expect(panel.getByRole("heading", { name: /Hint 1 of 3|Your error, explained|Hint 2 of 3/ })).toHaveCount(3)
  expect(errors).toEqual([])
})
