# NxtAI — Roadmap

_Last updated: 2026-11-01 · Branch: `dev` · Live: https://krpex.in · Task status lives in [tracker.md](./tracker.md)._

## Where we are

- **Public site** (`app/(site)`): `/`, `/about`, `/pricing`, `/contact`, `/login`, `/create-account`, `/forgot-password`, `/reset-password`, and policy drafts `/terms`, `/privacy`, `/refund-policy` (business details in `lib/legal.ts`, still to fill in). One price list (`lib/pricing.ts`) for home and `/pricing`. Contact form saves to Supabase.
- **Sign-in:** Supabase. GitHub OAuth, and **email + password** (sign-up with email confirmation, forgot/reset password) in the new design; auth calls run in the browser so Supabase's per-IP limits apply per learner. Google OAuth not set up yet. The old `/auth/*` pages are gone (old URLs redirect).
- **AI learning loop** (`app/(learn)`):
  - **Onboarding:** pick 1 of **9 categories** (tech / non-tech) → subject → goal (a quick AI goal check catches wrong-category, vague or harmful goals) → about you → schedule.
  - **AI professors:** one per category (labelled "AI professor", never presented as a real person). Their style shapes the course plan and every lesson; each course opens with a welcome note.
  - **Lessons as a class:** typed blocks (opening, objectives, explanation, analogy, worked example, "pause and think" checkpoints, common mistakes, real world, summary, homework), revealed one section at a time; checkpoints must be answered to continue. Final quiz (60% to pass) unlocks the next lesson.
  - **Ask the professor:** lesson-scoped chat with "Ask about this section" and quick buttons (simpler / another example / common mistakes). One structured AI call per answer (~₹0.015); off-topic, prompt-injection and harmful questions get a short redirect.
- **Plans, limits and credits** (enforced in Postgres, not the app):
  - Free: 5 questions/day (3 per lesson), 15 quick answers/day, 2 new courses/month. Pro: 40 / 10 / 100 / 10.
  - Credits are used after the free allowance: 1 per question, 20 per extra course. Max 3 new courses a day.
  - Global AI chat budget `PROFESSOR_DAILY_BUDGET_USD` (default $2/day) and `PROFESSOR_CHAT=off` kill switch.
  - Prices: ₹49 → 100 credits, ₹99 → 250 credits, Pro ₹499 per 30-day pass (no auto-renewal).
- **Payments (Razorpay, test mode):** buy buttons on `/account`; server-created orders (price from the server), Checkout (UPI/cards/netbanking), signature + captured-amount check, webhook `/api/razorpay/webhook` (`payment.captured`, `order.paid`). Credits/Pro are applied once per order by a server-key function. Verified with a real test payment on 2026-11-01.
- **Account** (`/account`, `/account/settings`): profile, today's usage (free allowance + credit headroom), plan & credits with buy buttons and payment history, learning preferences; change/add password, sign-in methods, sign out of all devices, delete account. Avatar menu in the header.
- **AI provider:** GPT-6 Luna ($0.10 / $0.50 per 1M tokens) through **OpenRouter** (`lib/ai/llm.ts`). Bedrock path built but blocked by AWS account access (support case open). Course plan ~15–20 s, lesson ~30–35 s.
- **Database (Supabase `dkdkokkzbptjbgjyjkpz`):** migrations 001–009 applied by hand in the SQL editor (`supabase/migrations/`); 010 (course-count backfill) pending. Tables: `users`, `contact_messages`, `learner_profiles`, `courses`, `course_modules`, `lessons`, `professor_questions`, `user_plans`, `credit_ledger`, `course_creations`, `payment_orders`, all with RLS. Learners only read their rows (not `lessons.quiz`); writes go through security-definer functions, and server-only ones require `SERVER_RPC_KEY` (SHA-256 hash in `private.server_keys`).
- **Dashboard** (`app/(app)/dashboard`): still the old purple theme with sample data (profile/settings now redirect to `/account`).
- **Stack:** Next.js 15.5.28, React 19.3, Tailwind v4, Supabase, OpenAI SDK (OpenRouter/Bedrock), pnpm.
- **Hosting:** one EC2 instance (Sydney), Elastic IP `54.79.194.65`, **krpex.in** (DNS at Hostinger), Let's Encrypt HTTPS, Nginx → pm2 (`nxtai`, port 3000, clean environment). Pushes via a repo-scoped deploy key.

## Security incident (2026-10-31)

Next.js 15.2.4 had a React Server Components remote-code-execution flaw. Between 21:46 and 22:58 UTC, scanners (`102.220.161.89`, `176.65.144.34`) sent 5 exploit requests that dumped the server's environment variables (Supabase anon key, a Claude Code session token). The Bedrock key was on disk, so it's treated as exposed. No persistence found.
**Done:** Next 15.5.28 / React 19.3.1, pm2 restarted with a clean environment. **Still to do:** Phase 0.

## Known gaps

| # | Gap | Status |
|---|-----|--------|
| G1 | OAuth providers | 🟡 GitHub done; Google pending |
| G5 | Home pricing ≠ `/pricing` | ✅ One list (`lib/pricing.ts`): Free, Pro ₹499/month, credits from ₹49 |
| G8 | Contact form has no email notification | 🟡 Saves to Supabase |
| G9 | TS/ESLint errors ignored in builds | 🟡 19 TS errors left, all in `components/hero-animation.tsx` |
| G10 | Dashboard on old theme with sample data | ✅ |
| G11 | pm2 not started on boot; no log rotation | ⬜ |
| G12 | Outdated packages | 🟡 Next patched; `auth-helpers-nextjs`, `recharts` 2.x, Next 16 pending |
| G13 | Secrets pasted in chat / possibly exposed | ⬜ Rotate OpenRouter key, delete Bedrock key, revoke old GitHub PAT, restart Claude Code session |
| G14 | AWS account can't use third-party Bedrock models | ⛔ AWS support case open |
| G15 | `pnpm audit`: PostCSS (build-time) and Zod highs | ⬜ |
| G16 | AI cost controls | 🟡 Chat quotas, course limits, credits and a chat budget done; lesson generation has no per-user cap yet (see G20) |
| G17 | Learning loop not yet verified end to end by a real user; no automated tests | 🟡 Partly tested on a phone |
| G18 | Site navbar shows "Log in" when already signed in | ✅ Avatar menu + "My courses" |
| G20 | Learners could write `courses` / `course_modules` / `lessons` directly via the Supabase API | ✅ Migration 008: writes via server-key RPCs, quiz graded in DB, `lessons.quiz` unreadable |
| G21 | Supabase built-in email only reaches team addresses (a few per hour) | ⬜ Set up custom SMTP (Hostinger `info@krpex.in`, Resend or SES) |
| G23 | Policy pages need the operator's legal name, address and jurisdiction; legal review | ⬜ Fill `lib/legal.ts` |
| G24 | Razorpay test key secret and webhook secret were shared in chat | ⬜ Test mode only; use fresh live keys at go-live |
| G25 | No admin view: usage, AI spend, payments, granting credits all need SQL | 🟡 `/admin` built (migration 012); all AI calls now logged |
| G22 | Email links (confirm / reset) must be opened in the same browser (PKCE) | ⬜ Optional: switch email templates to `token_hash` links via `/auth/confirm` |

## Phases

### Phase 0 — Security follow-up (P0)
1. Rotate the OpenRouter key and set a spending limit; delete the Bedrock key and IAM user; revoke the old GitHub PAT; restart the Claude Code session. **(G13)**
2. Decide: keep this instance or rebuild from the repo.
3. Dependabot alerts; Nginx rate limits on `POST` and scanner paths; consider Cloudflare/WAF.
4. ✅ Lock down direct table writes for learning data. **(G20)**

### Phase 1 — Sign-in (mostly done)
1. ✅ GitHub OAuth, profile rows, protected routes, `/error`.
2. ✅ Email/password sign-up, login, forgot/reset password in the new design.
3. Custom SMTP for auth emails **(G21)**; optional cross-device email links **(G22)**.
4. Google OAuth **(G1)**; signed-in state in the site navbar **(G18)**.

### Phase 2 — Production hosting
1. ✅ Elastic IP, domain, HTTPS, Nginx tuning.
2. `pm2 startup` + `pm2 save`; `pm2-logrotate`. **(G11)**
3. Deploy script, then GitHub Actions deploy on push.
4. Uptime monitoring; Supabase backups.

### Phase 3 — Public site
1. ✅ One price list everywhere, matching the plans and credit packs. **(G5)**
2. 🟡 Policy pages (Terms, Privacy, Refund & Cancellation) drafted; fill business details and review. **(G23)**
3. Contact form email notification. **(G8)**
4. SEO basics (favicon, OG image, metadata, sitemap, robots); analytics and Sentry.

### Phase 4 — Dashboard on real data
1. Move the dashboard onto the site design system and merge it with `/learn`. **(G10)**
2. Real progress, scores and streaks; delete legacy components and CSS.

### Phase 5 — Core product
1. ✅ Learning loop; ✅ categories + AI professors (A); ✅ class-style lessons (B); ✅ Ask the professor (E).
2. **C — Diagrams as code** in lessons (Mermaid / SVG rendered on the page).
3. **D — Illustrations** with GPT-5 Image Mini (max 2 per lesson, cached in Supabase Storage) plus stock photos.
4. **F — Catalog courses and narration** (ready-made courses per category; audio narration).
5. Regenerate lesson / report a problem; course archive and delete; stream lesson text.
6. Doc upload → lessons from the learner's material; module tests, final exam, certificates.
7. ✅ XP and levels (5.7, migration 026). Next: streak freeze + level rewards (5.7b), then coding practice in the browser (5.4), communities (5.6). Mock interviews (5.5) parked until we plan a real interview experience. See **XP and rewards** below.

### XP and rewards (planned 2026-11-07)

XP is a score that never goes down; it is not spent. Levels unlock rewards. Only the database awards XP (graded actions, each reward once), so it can't be farmed.

**Jobs for XP:** protect what you built → unlock real value → show off → compete.

1. **Now (5.7b)**
   - **Streak freeze:** earned at level 2 and for every 7-day streak; hold at most 2. A missed day uses one automatically (the server checks every 10 minutes) and the learner is told; the 7 pm reminder counts frozen days.
   - **Level rewards ladder** (given automatically, once each, with a notification): L2 streak freeze · L3 10 credits · L5 20 credits (one extra course) · L7 25 credits · L10 7-day Pro pass + one free certificate · L15 50 credits · L20 100 credits. Lifetime cost is capped at about 205 credits + one week of Pro per account.
   - **Share card** (next): "Level 6 · 18-day streak · 3 courses" image for WhatsApp / LinkedIn.
2. **With coding practice (5.4):** challenges worth 10 / 20 / 40 XP by difficulty, a first-run bonus, a daily challenge at double XP, and hard problems unlocked by level.
3. **With communities (5.6):** posting from level 2 and links from level 4 (spam control), level badges next to names, opt-in weekly leagues (~20 learners of a similar level in the same subject; top 3 move up; display names only).
4. **Later, with a few hundred active learners:** a monthly scholarship (top XP earned that month wins a free Pro month), real-professor time for top learners (an answer from a real professor or a live doubt session, Phase 8), quiz duels with a friend over WhatsApp invite links, and referral XP (50 XP each once the friend finishes a first lesson).

**Guardrails:** anything that costs money is capped or once per account; leagues and duels count only graded XP; leaderboards are opt-in and never show emails.

### Coding practice — code.krpex.in (5.4, draft 2026-11-07)

Same repo and same Next.js app; `proxy.ts` sends requests for `code.krpex.in` to `app/(coding)/coding/*`. Learners' code runs only in their browser (Pyodide for Python, a Web Worker for JavaScript); nothing runs on our server.

**A. Subdomain + shell (1 deploy).** 👤 DNS `A code → Elastic IP` at Spaceship; `code.krpex.in` in Nginx `server_name`; `sudo certbot --nginx -d krpex.in -d www.krpex.in -d code.krpex.in`. 🤖 Host rewrite in `proxy.ts` (`lib/code-host.ts`; `krpex.in/code/*` → subdomain with a 308); Supabase auth cookies on `.krpex.in` so one sign-in covers both (old host-only cookies are moved on the next visit, `shareAuthCookies`); sign-in from the subdomain goes through `krpex.in/login?next=/code…`; its own robots.txt and sitemap.

**B. Runner + editor + playground (with A).** CodeMirror 6 editor (pinned; extra key row on phones). `public/code-runner.html` in a sandboxed iframe (opaque origin: user code can't read cookies or call our API as the learner) → a blob Web Worker. Python: Pyodide 314.0.7 (Python 3.14) from jsDelivr, loaded with `import()` (~12 MB once, then cached); JavaScript runs in the worker. 5 s limit that starts after Python has loaded (the worker is killed and restarted), output capped at 64 KB, `input()` reads from an Input box (so no cross-origin-isolation headers are needed). Playground keeps code in the browser (localStorage); saved snippets on the server come with C.

**C. Problems, submissions, XP (migration 028).** Built 2026-11-08. 70 hand-written problems in `lib/code/problems.ts` (Basics, Strings, Lists, Dictionaries, Maths and loops, Recursion, Sorting and searching, Problem solving; 34 easy · 27 medium · 9 hard), each with tests and Python + JavaScript reference solutions; `tests/unit/code-problems.test.ts` runs every solution through the browser harness in both languages (Python via python3). The bank stays in the repo (reviewed in PRs, never sent to the browser with solutions); `coding_problems` mirrors slug, title, topic, difficulty and test count for XP, and a DB test checks they agree — new problems need a migration with their rows. `lib/code/harness.ts` wraps the learner's code with the tests and prints one results line; type-strict, numbers within 1e-6, optional any-order lists. Pages: `/problems` (by topic, solved/tried marks, problem of the day) and `/p/<slug>` (statement + examples, Run examples / Submit with hidden tests, last submissions; drafts kept in the browser). `submit_code()` saves the code (≤ 20 KB, 60 an hour, result checked against the test count) and pays XP once per problem: easy 10 · medium 20 · hard 40, ×2 for the problem of the day, +5 if the first submission passes, at most 150 coding XP a day; a solve also counts as a study day (streak). Problem of the day: `coding_daily_problem()` picks one per IST day the first time it's asked, not repeating within 30 days. Honesty: grading happens in the browser, so a determined learner could fake a pass; the limits and stored code keep the damage small, and leagues later only count reviewed or capped XP.

**v1 feedback (2026-11-09):** the first problem pages felt like a form, not a coding platform. Krpex Code v2 below replaces the old D–F notes.

### Krpex Code v2 — a full practice platform (planned 2026-11-09)

**Aim:** as good as the big practice sites where learners expect it (a dense problem table, a split-screen workspace, test cases you can edit, clear verdicts), and better where Krpex can be:

| Better than the usual practice site | How |
|---|---|
| No waiting, works offline-ish | Code runs in the learner's browser (Pyodide / JS worker); results in ~100 ms after the first load |
| Works on a phone | Problem / Code / Result tabs, an extra-keys row, nothing wider than the screen |
| Custom test cases show the right answer | Our own reference solution computes "Expected" on the server (our code only, never the learner's; small inputs, 1 s limit) |
| Failing test shown | A wrong hidden test shows its input, your output and the expected output |
| `print` per test case | Each case shows what your code printed during that case |
| Honest solutions | Hints in steps; the official solution can be opened any time, but the problem then pays no XP |
| Learning, not just grinding | Topic tags link to lessons; AI coach in steps (Phase 3); study plans that fit Indian placement and school timelines |
| One account, one XP | Same sign-in, XP, streak, levels and rewards as krpex.in courses |
| Indian languages | Statements and hints in Hindi with 8.3 |

**Shape of the site (code.krpex.in):** `/` home (continue, today's problem, study plans) · `/problems` problem set · `/p/<slug>` workspace · `/plans`, `/plans/<slug>` study plans (Phase 4) · community pages on community.krpex.in (Phase 5) · `/contests` (Phase 6) · `/playground`.

**Phase 1 — Problem set + workspace redesign (migration 029, 1–2 deploys).** Built first.
- `/problems`: one dense table (status · # · title · tags on wide screens · acceptance · difficulty), search, filters (difficulty, status, tag) kept in the URL, sort, "Pick one" (random unsolved). Problem of the day pinned. Side column: solved ring (easy / medium / hard), activity calendar (last 26 weeks of submissions), streak.
- `/p/<slug>`: full-screen workspace with its own top bar (problem list drawer, previous / next / random, Run, Submit, account). Resizable panes on desktop (drag, remembered); tabs on phones.
  - Left: **Description** (number, title, difficulty, tags, acceptance and solvers, statement, examples, hints revealed one at a time) · **Solution** (official Python + JavaScript; opening it before solving stops XP for that problem, asked once) · **Submissions** (yours, open any to see or load its code) · **Result** (appears after Submit: Accepted / Wrong answer / Runtime error / Time limit, tests passed, runtime, XP, the first failing test in full).
  - Right: editor (language, reset, font size, shortcuts Ctrl/⌘+' run · Ctrl/⌘+Enter submit) over a console: **Testcase** (cases as chips, every argument editable, add up to 8 own cases, reset) and **Test result** (verdict, runtime, per case: input, output, expected, printed text).
- Content: every problem gets tags and 1–2 written hints (unit test checks coverage).
- DB (029): `coding_problems.tags`; `coding_submissions.runtime_ms`; `coding_problem_stats()` (submissions, accepted, solvers per problem; public, aggregate only); `coding_reveals` + `reveal_coding_solution()`; `submit_code` pays no XP after a reveal.

**Phase 2 — More problems (no new code).** 70 → 150 ("Krpex 150", the core path; **150 built 2026-11-09**, migration 030) → 300. Drafted with AI help, every reference solution run by the unit test in both languages, reviewed before the migration that adds their rows. Later problems get a short editorial (idea, steps, time and space cost).

**Phase 3 — AI coach (was D).** **Built 2026-11-09** (migration 031; the code isn't stored, only a fingerprint for free repeats). Hints in 3 steps (never the full solution), "explain this error", review after solving (correctness, complexity, style, a cleaner version). Free 3 a day, Pro 30, then 1 credit each; same quota tables as Ask the professor. Code goes to the AI provider only when the learner asks (privacy page).

**Phase 4 — Study plans and courses (was E).** **Built 2026-11-09** (migration 032). Not yet: coding questions in module tests, and tags linking to a lesson (lessons are generated per learner, so there's no fixed lesson to link). Plans as ordered problem lists with a progress bar and a finish badge ("Python basics in 30 days", "Placement prep: arrays and strings", "Krpex 150"). Coding lessons end with linked practice problems; module tests can include a coding question. Tags link to the matching lesson.

**Phase 5 — Community (shared with 5.6 course communities).** Lives on its own subdomain, **community.krpex.in** (decided 2026-11-10; served by this app from `app/(community)/community`, like Code): profiles `/u/<handle>`, a problem's solutions and discussions `/p/<slug>/solutions|discuss`, boards `/c/<board>`, `/guidelines`. Code's workspace keeps Solutions / Discuss tabs with the top 3 posts and links out; account settings stay on krpex.in. Planned 2026-11-10 in three deploys: **5a profiles (migration 033, built 2026-11-10)** · 5b solutions and discussion per problem with reports, automatic hiding at 3 reports, an admin queue and notifications (034) · 5c general board + course communities (035). Decisions: upvotes only; profiles private by default; community solutions locked until solved (or the official solution opened); no XP for posting or votes; posting from level 2 with a handle and a 24-hour-old account; links from level 4.
- **5a as built:** `public_profiles` (handle 3–20 `[a-z0-9_]`, reserved words and anything with krpex/admin/moderat/official refused, change once per 30 days; display name ≤ 40 without "Krpex"; bio ≤ 160; links in name/bio only from level 4; `is_public` and `show_solves` off by default; `hidden` for admins). Written only through `save_public_profile()`; others read only through `public_profile()` (no email, user id or code). Settings on `/account#public-profile`; page `code.krpex.in/u/<handle>` (level, XP, streak, solved ring, 26-week activity, finished plans, lessons passed, recent solves if chosen); public handles in the Code sitemap; `LevelBadge` for later posts; privacy page updated.

Built once, generic, so courses reuse it:
- **Identity:** `public_profiles` (user id, unique `handle`, display name, avatar, bio, visibility; emails never shown). `/u/<handle>` shows level, XP, streak, solved counts by difficulty, the activity calendar, badges, recent solves (opt-in).
- **Posts:** `posts` (id, `space` such as `code:p:two-sum` / `code:discuss` / `course:<subject>`, kind `discussion | solution | question`, author, title, markdown body, optional code + language, score, comment count, status `visible | hidden | removed`), `comments` (threaded by `parent_id`), `votes` (one per user per post or comment), `reports` (reason, status) and a moderation queue in `/admin`.
- **Rules from the XP plan:** posting from level 2, links from level 4, rate limits in the database, level badges next to names. A problem's shared solutions and spoiler discussions open only after you solve it (or open the official solution).
- **Notifications:** replies and votes through the existing notifications and push.

**Phase 6 — Contests and leagues.** Weekly 90-minute contest (4 problems) and the opt-in weekly leagues from the XP plan. Browser grading can be faked, so contest submissions are re-checked on a separate small runner box (containers, no network, CPU and memory limits) before ranking; practice stays in the browser.

**Phase 7 — More languages and playgrounds (was F).** SQL practice (SQLite in the browser), an HTML/CSS/JS playground with live preview, C/C++/Java on the Phase 6 runner if learners ask for it.

### Phase 6 — Payments (Razorpay)
1. ✅ Plans, limits and credit ledger in the database (migration 007); account page shows plan, limits and credits.
2. Razorpay account + KYC 👤; policy pages (Phase 3.2).
3. ✅ Credit packs and a **Pro 30-day pass** (no auto-renewal): server-created orders (price from the server), Razorpay Checkout, signature + amount check, webhook at `/api/razorpay/webhook`; credits/Pro added by a server-key RPC (migration 009), idempotent per order.
4. Auto-renewing Pro via Razorpay Subscriptions (later).
5. ✅ Payment history on `/account`.
6. Go live: switch to live keys and a new webhook secret after KYC.

### Phase 7 — Quality
1. Fix the remaining TS errors (`hero-animation.tsx`) and stop ignoring TS/ESLint in builds. **(G9)**
2. Next 16; drop `auth-helpers-nextjs`; update `recharts`; clear audit highs. **(G12, G15)**
3. Playwright e2e tests and CI on pull requests.

### Phase 8 — Professor portal (pilot: Physics, English + Hindi)
Real professors volunteer to teach Krpex's AI. They feed in material, a teaching style and corrections; the AI uses them each time it writes a lesson (no model retraining until there's enough reviewed data). Each pilot professor becomes a **named AI professor**, e.g. "Prof. Sharma (AI)": always labelled AI, with the real professor credited and consenting.

**Decisions (2026-11-04):** volunteers (no payouts for now); named AI professors; pilot = Physics (Science → Physics) in English and Hindi; 2–3 professors.

**How the AI uses professors' data**
1. *Knowledge:* their approved material (notes, slides, lecture transcripts, question banks) is split into sections (reusing 5.2) and searched for each lesson/test/chat; the AI teaches from the closest passages.
2. *Teaching style:* a teaching profile per professor (how they open a topic, favourite analogies, common mistakes they warn about, pacing, tone, language), written by the professor with AI help, plus their best explanations as examples in the prompt.
3. *Corrections:* professors review AI lessons in their subject (rate, edit, comment). Edits become examples and test cases; this is also the dataset for retraining later.

**Portal (`/teach`), invite only**
- Professor accounts: invite link from `/admin`, profile (name, photo, title, institution, subjects, languages, short bio), credentials checked by admin, contributor agreement accepted in the portal.
- Inputs: upload documents (PDF/Word/PPT, from 5.2), upload lecture audio/video (transcribed by an outside service; only the transcript is kept), write a model lesson in the lesson-block editor, question bank (question, options, answer, explanation, common wrong answer), teaching profile form.
- Review queue: AI-written Physics lessons (from learners' courses, anonymised) to rate 1–5, edit inline and comment; "approve as example".
- Everything is tagged with language (en/hi) and topic, and is a draft until the professor publishes it; admin can unpublish.
- Withdrawal: a professor can remove any item or leave; their content stops being used immediately.

**Learner side**
- Onboarding for Physics: choose a professor (photo, bio, "AI version of Prof. X, trained on their material"), and a teaching language: English or हिन्दी.
- Lessons, quizzes, tests and chat in the chosen language (formulas stay as maths; Devanagari font added); the course page and lessons say "Taught by Prof. X (AI)", with a link to the professor's page.
- Learners can rate a lesson and flag it for the professor.

**Measuring it:** professor ratings of AI lessons, learner lesson ratings, quiz pass rates and course completion for professor-backed vs. generic Physics courses.

**Before inviting anyone (👤):** contributor agreement (licence to use uploads, their name, photo and teaching style for an AI professor; right to withdraw; only upload material they own or may share), reviewed by a lawyer; a short page explaining the programme.

**Phases:** 8.1 portal + profiles + uploads + review queue → 8.2 professor-backed lessons (style, search, examples) + professor choice + "Taught by" → 8.3 Hindi teaching language → 8.4 lecture transcription + question banks + flagged questions inbox → 8.5 (later) retraining an open model once ~5,000 reviewed items exist.

## Decisions log

| Date | Decision |
|------|----------|
| 2026-10-31 | Public site cloned from nxtai.in; Tailwind v4; route groups `(site)`, `(app)`, `(learn)` |
| 2026-10-31 | First product feature = AI learning loop in the nxtai.in design system |
| 2026-10-31 | AI = GPT-6 Luna via OpenRouter; Bedrock path kept for when AWS grants access |
| 2026-10-31 | Hosting on EC2 + Nginx + pm2 at `krpex.in`; Supabase migrations applied by hand |
| 2026-10-31 | No Supabase service_role key on the server; privileged writes go through security-definer functions (and an Edge Function for payments) |
| 2026-11-01 | 9 categories, one labelled AI professor each; lessons generated as typed blocks |
| 2026-11-01 | Ask the professor: lesson-scoped, quotas in Postgres, $2/day global budget |
| 2026-11-01 | Email/password auth runs in the browser (per-learner rate limits) |
| 2026-11-01 | Brand shown on the site renamed NxtAI → **Krpex** (company name on the AWS Activate application). Internal IDs (`nxtai` professor id, `nxtai:lecture` keys, repo name) unchanged |
| 2026-11-01 | Free / Pro plans + one-time credit packs (₹49/100, ₹99/250, Pro ₹499/month); limits enforced in Postgres |
| 2026-11-04 | Professor portal: volunteer professors; named AI professors (labelled AI, with consent); pilot Physics in English + Hindi; their data used at lesson time (no retraining until ~5,000 reviewed items) |

## Next up (proposed 2026-11-01)

1. **Sprint 1 — Ready for real users:** signed-in navbar (G18); stream lesson text (cut the ~35 s wait); course delete/archive, regenerate lesson, report a problem; admin page (users, usage, AI spend, payments, grant credits) (G25); Nginx rate limits + deploy script; uptime + error tracking.
2. **Sprint 2 — Richer lessons:** diagrams as code (C), illustrations with GPT-5 Image Mini cached in Storage (D).
3. **Sprint 3 — Payments live:** KYC, live keys + new webhook secret, legal details (G23, G24), GST/invoice decision.
4. **Sprint 4 — Progress & retention:** dashboard on real data with streaks (G10), catalog courses and narration (F), e2e tests + CI (Phase 7).

👤 in parallel: SMTP (G21), legal details (G23), `pm2 startup` (G11), rotate exposed keys (G13), Google OAuth (G1).
