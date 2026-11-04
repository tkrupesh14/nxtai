import { execFileSync } from "node:child_process"

import { expect, test } from "@playwright/test"

// The professor portal (8.1) as the same test learner: made an admin, they invite themselves, join, upload and
// publish material. Runs after learning.spec.ts (one worker, files in order).
test.describe.configure({ mode: "serial" })

/** Run SQL as the database owner in the local test Supabase (never the live one; see playwright.signed-in.config.ts). */
function localSql(statement: string) {
  return execFileSync("docker", ["exec", "supabase_db_krpex-e2e", "psql", "-U", "postgres", "-tA", "-v", "ON_ERROR_STOP=1", "-c", statement], {
    stdio: "pipe",
    encoding: "utf8",
  }).trim()
}

test("an invited professor joins, uploads and publishes material", async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))

  // Not a professor yet.
  await page.goto("/teach")
  await expect(page.getByText(/This space is for professors invited by Krpex/)).toBeVisible()

  const email = localSql("select email from auth.users order by created_at desc limit 1")
  expect(email).toMatch(/@example\.com$/)
  localSql(`insert into private.admins (user_id) select id from auth.users where email = '${email.replace(/'/g, "")}' on conflict do nothing`)

  // Admin creates an invite; the link is shown once.
  await page.goto("/admin")
  await page.getByLabel("Professor email").fill(email)
  await page.getByRole("button", { name: "Create invite" }).click()
  const link = await page.getByLabel("Invite link").inputValue()
  expect(link).toMatch(/\/teach\/join\?token=[0-9a-f]{64}$/)

  // A wrong token is refused.
  await page.goto("/teach/join?token=nope")
  await expect(page.getByText("This invite link isn't valid")).toBeVisible()

  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByText("Invitation: Physics professor")).toBeVisible()
  await expect(page.getByText("Your named AI professor")).toBeVisible()
  await page.getByLabel("Your name, as learners will see it").fill("Dr. Test Professor")
  await page.getByRole("button", { name: "Join as a professor" }).click()
  // The agreement must be accepted (the browser blocks the form until it's ticked).
  await expect(page).toHaveURL(/\/teach\/join/)
  await page.getByLabel("I have read the agreement above and accept it.").check()
  await page.getByRole("button", { name: "Join as a professor" }).click()
  await expect(page).toHaveURL(/\/teach\?welcome=1$/)
  await expect(page.getByRole("heading", { name: "Welcome, Dr. Test Professor" })).toBeVisible()
  await expect(page.getByText(/Krpex is checking your profile/)).toBeVisible()
  await expect(page.getByRole("link", { name: "Teaching" }).first()).toBeVisible()

  // The invite worked once.
  await page.goto(new URL(link).pathname + new URL(link).search)
  await expect(page.getByText("You're already a Krpex professor")).toBeVisible()

  // Profile.
  await page.goto("/teach")
  await page.getByLabel("Title", { exact: true }).fill("Professor of Physics")
  await page.getByLabel("हिन्दी (Hindi)").first().check()
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()

  // Upload: saved as a draft; publishing waits for approval.
  await page.getByLabel("Material title").fill("Light notes")
  await page.getByLabel("Topic").fill("Optics")
  await page.getByLabel(/^File \(PDF/).setInputFiles("tests/fixtures/photosynthesis.pdf")
  await page.getByRole("button", { name: "Upload" }).click()
  const list = page.getByRole("list", { name: "Your material" })
  await expect(list.getByText("Light notes")).toBeVisible()
  await expect(list.getByText(/Draft · English · Optics · 3 pages/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Publish Light notes" })).toBeDisabled()

  // Admin approves; now it can be published.
  await page.goto("/admin")
  await page.getByRole("button", { name: "Approve" }).click()
  await expect(page.getByText(/approved · Physics/)).toBeVisible()
  await page.goto("/teach")
  await expect(page.getByText(/You're approved/)).toBeVisible()
  await page.getByRole("button", { name: "Publish Light notes" }).click()
  await expect(list.getByText(/Published · English/)).toBeVisible()

  // Withdraw: deleted for good.
  page.once("dialog", (d) => d.accept())
  await page.getByRole("button", { name: "Remove Light notes" }).click()
  await expect(list).toHaveCount(0)
  expect(localSql("select count(*) from public.professor_material_sections")).toBe("0")

  expect(errors).toEqual([])
})

test("a professor writes, previews and publishes a model lesson", async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("dialog", (d) => d.accept())

  await page.goto("/teach")
  await page.getByRole("link", { name: "Write a model lesson" }).click()
  await expect(page.getByRole("heading", { name: "New model lesson" })).toBeVisible()
  await page.getByLabel("Lesson title").fill("Newton's second law")
  await page.getByLabel("Block 1 (Opening) text").fill("Today we meet the most useful equation in mechanics: $$F = ma$$")

  // Empty blocks are pointed out before saving.
  await page.getByRole("button", { name: "Save draft" }).click()
  await expect(page.getByText("Block 2: The objectives block is empty.")).toBeVisible()

  await page.getByLabel("Block 2 (Objectives) list").fill("Use F = ma\nPredict acceleration")
  await page.getByLabel("Remove Block 3 (Explanation)").click()
  await page.getByLabel("Remove Block 3 (Worked example)").click()
  // Now: 1 Opening, 2 Objectives, 3 Practice question, 4 Summary.
  await page.getByLabel("Block 3 (Practice question) question").fill("A 2 kg cart is pushed with 10 N. Its acceleration?")
  for (const [k, v] of ["20 m/s²", "5 m/s²", "12 m/s²", "0.2 m/s²"].entries()) {
    await page.getByLabel(`Block 3 (Practice question) option ${"ABCD"[k]}`, { exact: true }).fill(v)
  }
  await page.getByLabel("Block 3 (Practice question): option B is correct").check()
  await page.getByLabel("Block 3 (Practice question) explanation").fill("a = F / m = 10 / 2 = 5 m/s².")
  await page.getByLabel("Block 4 (Summary) list").fill("Force causes acceleration")
  await page.getByLabel("Move Block 4 (Summary) up").click()
  await expect(page.getByLabel("Block 3 (Summary) list")).toHaveValue("Force causes acceleration")

  await page.getByRole("button", { name: "Save draft" }).click()
  await expect(page).toHaveURL(/\/teach\/lessons\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { name: "Newton's second law" })).toBeVisible()

  // The preview is the real lesson view: maths rendered, practice question answerable.
  await page.getByRole("tab", { name: "Preview" }).click()
  const preview = page.getByLabel("Lesson preview")
  await expect(preview.locator(".katex").first()).toBeVisible()
  await expect(preview.locator(".katex-error")).toHaveCount(0)
  await expect(preview.getByText("Pause and think")).toBeVisible()
  await preview.getByRole("radio", { name: "5 m/s²" }).check()
  await preview.getByRole("button", { name: "Check my answer" }).click()
  await expect(preview.getByText(/a = F \/ m/)).toBeVisible()

  // Publish from the Teaching page (this professor was approved in the previous test).
  await page.goto("/teach")
  const lessons = page.getByRole("list", { name: "Your lessons" })
  await expect(lessons.getByText(/Draft · .* · 4 blocks/)).toBeVisible()
  await page.getByRole("button", { name: "Publish lesson Newton's second law" }).click()
  await expect(lessons.getByText(/Published ·/)).toBeVisible()
  expect(errors).toEqual([])
})
