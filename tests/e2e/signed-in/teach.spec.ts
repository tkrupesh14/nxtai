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
  await page.goto("/admin/professors")
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
  await page.getByLabel("Material topic").fill("Optics")
  await page.getByLabel(/^File \(PDF/).setInputFiles("tests/fixtures/photosynthesis.pdf")
  await page.getByRole("button", { name: "Upload", exact: true }).click()
  const list = page.getByRole("list", { name: "Your material" })
  await expect(list.getByText("Light notes")).toBeVisible()
  await expect(list.getByText(/Draft · English · Optics · 3 pages/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Publish Light notes" })).toBeDisabled()

  // Admin approves; now it can be published.
  await page.goto("/admin/professors")
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

test("the admin adds an AI lesson for review, and the professor reviews it", async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))

  await page.goto("/admin/professors")
  await page.getByLabel("Lesson topic").fill("Projectile motion")
  await page.getByRole("button", { name: "Write a lesson for review" }).click()
  await expect(page.getByText('Added "Projectile motion" to the review queue.')).toBeVisible()
  const adminList = page.getByRole("list", { name: "Lessons for review" })
  await expect(adminList.getByText(/open · English · Class 11–12 \(school\) · \d+ blocks · 0 reviews/)).toBeVisible()

  // The professor (approved in the first test) sees it in their queue.
  await page.goto("/teach")
  const queue = page.getByRole("list", { name: "Lessons to review" })
  await expect(queue.getByText("Projectile motion")).toBeVisible()
  await page.getByRole("link", { name: "Review Projectile motion" }).click()
  await expect(page.getByRole("heading", { name: "Projectile motion" })).toBeVisible()
  await expect(page.getByLabel("End-of-lesson quiz").getByText("(correct)").first()).toBeVisible()

  await page.getByRole("button", { name: "Add a note on block 2" }).click()
  await page.getByLabel("Block 2 note").fill("Define the symbols before using them.")
  await page.getByLabel("Block 2 suggestion").fill("Here $$v$$ is the speed.")

  // Every rating is needed.
  await page.getByRole("button", { name: "Submit review" }).click()
  await expect(page.getByText('Give a rating for "Accurate".')).toBeVisible()
  for (const [label, v] of [["Accurate", 5], ["Clear", 4], ["Right level", 4], ["Overall", 4]] as const) {
    await page.getByLabel(`${label}: ${v} out of 5`).check({ force: true })
  }
  await page.getByLabel("Overall comment (optional)").fill("Clear, but slow down on the vectors.")
  await page.getByRole("button", { name: "Submit review" }).click()
  await expect(page.getByText(/Thank you. Your review is saved/)).toBeVisible()

  // Coming back shows the saved review.
  await page.goto("/teach")
  await expect(queue.getByText(/Reviewed ✓/)).toBeVisible()
  await page.getByRole("link", { name: "Edit your review of Projectile motion" }).click()
  await expect(page.getByLabel("Block 2 note")).toHaveValue("Define the symbols before using them.")
  await expect(page.getByLabel("Accurate: 5 out of 5")).toBeChecked()
  await expect(page.getByRole("button", { name: "Update review" })).toBeVisible()

  // The admin sees it.
  await page.goto("/admin/professors")
  await expect(adminList.getByText(/1 review · Accurate 5, Clear 4, Right level 4, Overall 4/)).toBeVisible()
  await adminList.getByText("Read the reviews").click()
  await expect(adminList.getByText("Define the symbols before using them.")).toBeVisible()
  expect(errors).toEqual([])
})

test("a professor uploads a lecture recording, corrects the transcript and adds it to their material", async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))

  await page.goto("/teach")
  await page.getByLabel("Lecture title").fill("Newton in Hindi")
  await page.getByLabel("Hindi (English words are kept in English)").check()
  // Not real audio: the fake Sarvam (tests/support/fake-sarvam.mjs) transcribes anything to a fixed transcript.
  // 12 MB: over the proxy's 10 MB body limit, so this checks the upload streams through whole.
  await page.getByLabel("Recording", { exact: true }).setInputFiles({ name: "lecture.mp3", mimeType: "audio/mpeg", buffer: Buffer.alloc(12 * 1024 * 1024, 1) })
  await page.getByRole("button", { name: "Upload recording" }).click()
  await expect(page.getByText(/Uploaded\. Transcribing now/)).toBeVisible()

  // The list checks on the transcription every 15 seconds.
  const list = page.getByRole("list", { name: "Your recordings" })
  await expect(list.getByText(/Transcript ready to check/)).toBeVisible({ timeout: 60_000 })
  await page.getByRole("link", { name: "Check the transcript of Newton in Hindi" }).click()
  const transcript = page.getByRole("textbox", { name: "Transcript", exact: true })
  await expect(transcript).toHaveValue(/^\[0:00\] Newton का दूसरा नियम [^\n]*\n\n\[1:05\] अब एक example देखते हैं।$/)

  await transcript.fill("[0:00] Newton का दूसरा नियम: $$F = ma$$\n\n[1:05] अब एक example देखते हैं।")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()
  await page.getByRole("button", { name: "Add to my material" }).click()
  await expect(page.getByText(/Added to your material as a draft/)).toBeVisible()
  await expect(transcript).toHaveAttribute("readonly", "")

  await page.goto("/teach")
  await expect(list.getByText(/Added to your material/)).toBeVisible()
  await expect(page.getByText(/Lecture transcript, 1 part/)).toBeVisible()
  expect(errors).toEqual([])
})

test("a live professor's AI version teaches a learner's course from their material", async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const professorId = localSql("select id from public.professors limit 1")

  // The professor describes how they teach and asks to be shown to learners.
  await page.goto("/teach")
  await page.getByLabel("How you teach (the AI follows this)").fill("I start from an everyday observation and always check units.")
  await page.getByLabel(/Show my AI professor to learners/).check()
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Saved.")).toBeVisible()
  await expect(page.getByText(/You asked to show your AI professor to learners\. Krpex will check/)).toBeVisible()

  // Material matching the fake AI's first lesson ("First steps", module "Getting started").
  await page.getByRole("button", { name: "Paste text instead" }).click()
  await page.getByLabel("Material title").fill("Getting started notes")
  await page.getByLabel("Material topic").fill("Mechanics")
  await page.getByLabel("Text", { exact: true }).fill("First steps in mechanics: start from what you see, then measure it. ".repeat(8))
  await page.getByRole("button", { name: "Add this text" }).click()
  await page.getByRole("button", { name: "Publish Getting started notes" }).click()
  await expect(page.getByRole("list", { name: "Your material" }).getByText(/Published · English · Mechanics/)).toBeVisible()

  // A question for the bank (used in module tests of courses the AI version teaches).
  const bank = page.getByRole("form", { name: "New question" })
  await bank.getByLabel("Question").fill("A ball is thrown straight up. What is its acceleration at the top?")
  for (const [i, o] of ["Zero", "g, downwards", "g, upwards", "It depends on the speed"].entries()) await bank.getByLabel(`Option ${"ABCD"[i]}`, { exact: true }).fill(o)
  await bank.getByLabel("Option B is correct").check()
  await bank.getByLabel("Topic").fill("First steps in mechanics")
  await bank.getByRole("button", { name: "Add question" }).click()
  await expect(page.getByText(/Question added as a draft/)).toBeVisible()
  await page.getByRole("button", { name: /^Publish question: A ball is thrown/ }).click()
  await expect(page.getByRole("list", { name: "Your questions" }).getByText(/Published · English · First steps in mechanics · Answer: B\) g, downwards/)).toBeVisible()

  // Not public until Krpex makes it live.
  expect((await page.request.get(`/professors/${professorId}`)).status()).toBe(404)
  await page.goto("/admin/professors")
  await expect(page.getByText(/asked to go live/)).toBeVisible()
  await page.getByRole("button", { name: "Make Dr. Test Professor live" }).click()
  await expect(page.getByText(/live for learners/)).toBeVisible()

  // The public page, then a course with the professor's AI version.
  await page.goto(`/professors/${professorId}`)
  await expect(page.getByRole("heading", { name: "Dr. Test Professor", exact: true })).toBeVisible()
  await expect(page.getByText(/is an AI tutor, not Dr\. Test Professor/)).toBeVisible()
  localSql("delete from public.course_creations") // earlier tests used today's course allowance (local test DB only)
  await page.getByRole("link", { name: "Start a Physics course with Dr. Test Professor (AI)" }).click()
  await expect(page).toHaveURL(/\/onboarding\?teacher=/)
  await expect(page.getByRole("radio", { name: /Dr\. Test Professor \(AI\)/ })).toBeChecked()
  await page.getByLabel("What do you want to learn or achieve?").fill("Mechanics from first principles")
  await page.getByLabel("Completely new to it").check()
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Continue" }).click()
  await page.getByRole("button", { name: "Build my course" }).click()

  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}$/)
  const courseUrl = new URL(page.url()).pathname
  await expect(page.getByRole("link", { name: "Dr. Test Professor (AI)" })).toBeVisible()
  await expect(page.getByText("AI version", { exact: true })).toBeVisible()
  expect(localSql("select professor from public.courses order by created_at desc limit 1")).toBe(`p:${professorId}`)

  // The lesson prompt had the professor, their matching material and their model lesson.
  await page.getByRole("link", { name: "Start first lesson" }).click()
  await expect(page.getByText(/Taught as Dr\. Test Professor \(AI\), with [1-9]\d* excerpts? of their material and a model lesson\./).first()).toBeVisible({ timeout: 60_000 })

  // The learner asks the real professor to check an AI answer; the professor replies without seeing who asked.
  const lessonUrl = new URL(page.url()).pathname
  await page.getByRole("button", { name: "Start the class" }).first().click()
  await expect(page.getByText(/^Section 1 of \d+$/)).toBeVisible({ timeout: 12_000 })
  await page.getByRole("button", { name: /Ask about this section/ }).first().click()
  await page.getByLabel("Your question").fill("Why do we measure before we explain?")
  await page.getByRole("button", { name: "Ask", exact: true }).click()
  await expect(page.getByText("Fake professor answer to: Why do we measure before we explain?")).toBeVisible()
  // Live updates (9.1): the professor's portal is open in another tab and updates without a reload.
  const teach = await page.context().newPage()
  teach.on("pageerror", (e) => errors.push(e.message))
  await teach.goto("/teach")
  await expect(teach.getByRole("heading", { name: "Learner questions", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Ask Dr. Test Professor to check this answer" }).click()
  await page.getByLabel("What should Dr. Test Professor look at? (optional)").fill("Is this how you'd explain it?")
  await page.getByRole("button", { name: "Send to Dr. Test Professor" }).click()
  await expect(page.getByText("Sent to Dr. Test Professor. Their reply will appear here.")).toBeVisible()

  await expect(teach.getByRole("heading", { name: "Learner questions (1 to answer)" })).toBeVisible({ timeout: 20_000 })
  await expect(teach.getByRole("status").getByText("A learner asked you to check an answer")).toBeVisible()
  await expect(teach.getByRole("button", { name: /^Notifications, \d+ unread$/ })).toBeVisible()
  const inbox = teach.getByRole("list", { name: "Learner questions" })
  await expect(inbox.getByText("Why do we measure before we explain?", { exact: true })).toBeVisible()
  await expect(inbox.getByText("Fake professor answer to: Why do we measure before we explain?")).toBeVisible()
  await expect(inbox.getByText("Is this how you'd explain it?")).toBeVisible()
  await expect(inbox.getByText(/^A learner · lesson/)).toBeVisible()
  await inbox.getByLabel(/Your reply/).fill("Because a number keeps us honest: guesses feel right until we check.")
  await inbox.getByRole("button", { name: "Send reply" }).click()
  await expect(inbox.getByText(/You replied/)).toBeVisible()

  // The learner's open chat shows the reply without a reload.
  await expect(page.getByText("Reply from Dr. Test Professor, the real professor")).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("Because a number keeps us honest: guesses feel right until we check.")).toBeVisible()
  await teach.close()

  // Notifications (9.2): the bell lists them; one opens the lesson with the chat.
  await page.getByRole("button", { name: /^Notifications/ }).click()
  const panel = page.getByRole("dialog", { name: "Notifications" })
  await expect(panel.getByText("A learner asked you to check an answer")).toBeVisible()
  await panel.getByRole("link", { name: /Dr\. Test Professor replied to your question/ }).click()
  await expect(page.getByRole("dialog", { name: "Ask Dr. Test Professor (AI)" })).toBeVisible()
  await page.goto("/notifications")
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible()
  await page.getByRole("button", { name: "Mark all as read" }).click()
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible()
  await expect(page.getByText(/unread/)).toHaveCount(0)
  expect(lessonUrl).toMatch(/^\/learn\//)

  // Hidden again: the page is gone and the course falls back to the AI professor.
  await page.goto("/admin/professors")
  await page.getByRole("button", { name: "Hide Dr. Test Professor from learners" }).click()
  await expect(page.getByText(/asked to go live/)).toBeVisible()
  expect((await page.request.get(`/professors/${professorId}`)).status()).toBe(404)
  await page.goto(courseUrl)
  await expect(page.getByText("Dr. Test Professor (AI)")).toHaveCount(0)
  expect(errors).toEqual([])
})

test("the admin panel has one page per section, and old links open the right one", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const nav = page.getByRole("navigation", { name: "Admin sections" })

  await page.goto("/admin")
  await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page")

  const sections = [
    ["Users", "/admin/users", "Find a learner"],
    ["Money", "/admin/money", /^Payments \(\d+\)$/],
    ["Lesson reports", "/admin/reports", /^Open \(\d+\)$/],
    ["Community", "/admin/community", /^Needs review \(\d+\)$/],
    ["Professors", "/admin/professors", /^Professors \(\d+\)$/],
    ["System", "/admin/system", /^Errors, last 24 hours/],
  ] as const
  for (const [label, path, section] of sections) {
    await nav.getByRole("link", { name: label }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole("heading", { name: label, level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: section, level: 2 })).toBeVisible()
    await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page")
  }

  // Users: filter, open a learner, give credits from their page and see it in the history.
  await page.goto("/admin/users?q=example.com&active=7d")
  const users = page.getByRole("list", { name: "Users" })
  await expect(users.getByRole("link").first()).toBeVisible()
  await users.getByRole("link").first().click()
  await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f-]{36}$/)
  const learnerPath = new URL(page.url()).pathname
  for (const h of ["Credits and Pro", "Learning", "AI use", "Payments", "Code", "Community", "Admin history"]) {
    await expect(page.getByRole("heading", { name: h, level: 2 })).toBeVisible()
  }
  await page.getByLabel("Credits").fill("3")
  await page.getByLabel("Note (optional)").fill("e2e goodwill")
  await page.getByRole("button", { name: "Apply" }).first().click()
  await expect(page.getByText(/^Done: \+3 credits for /)).toBeVisible()
  await page.reload()
  await expect(page.getByRole("list", { name: "Admin history" }).getByText("Gave 3 credits")).toBeVisible()
  await expect(page.getByRole("list", { name: "Credit history" }).getByText("e2e goodwill")).toBeVisible()
  await page.goto("/admin/system")
  await expect(page.getByRole("list", { name: "Admin activity" }).getByText("Gave 3 credits").first()).toBeVisible()
  expect((await page.request.get("/admin/users/not-a-user")).status()).toBe(404)

  // Money: periods, AI cost in rupees, the dollar rate (logged).
  await page.goto("/admin/money?days=7")
  await expect(page.getByRole("navigation", { name: "Period" }).getByRole("link", { name: "Last 7 days" })).toHaveAttribute("aria-current", "page")
  for (const h of ["By day", "AI cost by feature", "AI cost by model", "Costliest learners", "Credits", "Dollar rate"]) {
    await expect(page.getByRole("heading", { name: h, level: 2 })).toBeVisible()
  }
  await expect(page.getByRole("table", { name: "By day" }).getByRole("row")).toHaveCount(8)
  await expect(page.getByRole("table").filter({ hasText: "$" })).toHaveCount(0) // costs in rupees only
  await page.getByLabel("₹ per US dollar").fill("88")
  await page.getByRole("button", { name: "Save" }).click()
  await expect(page.getByText("Saved: $1 = ₹88.")).toBeVisible()
  await page.getByRole("navigation", { name: "Payment status" }).getByRole("link", { name: "Failed" }).click()
  await expect(page).toHaveURL(/\/admin\/money\?days=7&status=failed$/)
  await page.goto("/admin/system")
  await expect(page.getByRole("list", { name: "Admin activity" }).getByText("Set the dollar rate to ₹88").first()).toBeVisible()

  // Community: queue filters, bans, boards on/off (logged in the history).
  await page.goto("/admin/community")
  for (const h of [/^Can't post \(\d+\)$/, "Boards", "Moderation history"]) {
    await expect(page.getByRole("heading", { name: h, level: 2 })).toBeVisible()
  }
  await page.getByRole("navigation", { name: "Queue filter" }).getByRole("link", { name: "Hidden" }).click()
  await expect(page).toHaveURL(/\/admin\/community\?show=hidden$/)
  await expect(page.getByRole("heading", { name: /^Hidden \(\d+\)$/, level: 2 })).toBeVisible()
  const boards = page.getByRole("list", { name: "Boards" })
  await boards.getByRole("button", { name: "Turn off Feedback for Krpex" }).click()
  await expect(boards.getByRole("button", { name: "Turn on Feedback for Krpex" })).toBeVisible()
  await expect(page.getByRole("list", { name: "Moderation history" }).getByText("Turned off the Feedback for Krpex board").first()).toBeVisible()
  await boards.getByRole("button", { name: "Turn on Feedback for Krpex" }).click()
  await expect(boards.getByRole("button", { name: "Turn off Feedback for Krpex" })).toBeVisible()

  // Notifications already sent link to /admin#community.
  await page.goto("/admin#community")
  await expect(page).toHaveURL(/\/admin\/community$/)

  // Phones: tabs scroll, the page doesn't.
  await page.setViewportSize({ width: 360, height: 760 })
  for (const path of ["/admin", "/admin/users", learnerPath, "/admin/money", "/admin/community", "/admin/professors"]) {
    await page.goto(path)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    // Overflow can be clipped rather than scroll, so also check every section ends inside the screen.
    const overhang = await page.evaluate(() =>
      Math.max(...[...document.querySelectorAll("main section, main h1")].map((el) => el.getBoundingClientRect().right - window.innerWidth)),
    )
    expect(overhang).toBeLessThanOrEqual(0)
  }
  expect(errors).toEqual([])
})
