# NxtAI — Tracker

Plan and context: [plan.md](./plan.md). Update the **Status** column as work moves.

**Status:** ⬜ Todo · 🟡 In progress · ✅ Done · ⛔ Blocked
**Priority:** P0 = blocks launch · P1 = needed soon · P2 = later
**Owner:** 👤 = needs you (dashboard, account or business decision) · 🤖 = Claude can do it

## Done

| ID | Task | Done on | Ref |
|----|------|---------|-----|
| D1 | Clone repo, install Node 22, pnpm, Nginx and pm2 on EC2 | 2026-10-31 | — |
| D2 | Serve the app publicly via Nginx → pm2 | 2026-10-31 | — |
| D3 | Switch to the `dev` branch and configure Supabase env vars | 2026-10-31 | — |
| D4 | Public pages match nxtai.in; Tailwind v4 upgrade; OAuth callback route | 2026-10-31 | `e71289b` |
| D5 | Sign-in fixes: profile rows, `/login` redirects, `/error`, middleware protection | 2026-10-31 | `913ec25` |
| D6 | Mobile menu, footer links, contact form → Supabase | 2026-10-31 | `913ec25` |
| D7 | Domain `krpex.in`, Elastic IP, HTTPS, Nginx timeouts + header buffers | 2026-10-31 | server config |
| D8 | Supabase schema: `users` + trigger, `contact_messages`, learning tables, RLS | 2026-10-31 | migrations 001–003 |
| D9 | AI learning loop: onboarding → course plan → lessons → graded quizzes → unlocking | 2026-10-31 | `913ec25` |
| D10 | AI via GPT-6 Luna on OpenRouter (Bedrock path built, awaiting AWS access) | 2026-10-31 | `lib/ai/llm.ts` |
| D11 | GitHub OAuth enabled in Supabase | 2026-10-31 | Supabase dashboard |
| D12 | **Security:** Next 15.2.4 → 15.5.28 after RCE exploitation; clean pm2 env; stopped cookie logging | 2026-10-31 | `913ec25` |
| D13 | Repo-scoped deploy key for pushes from the server | 2026-10-31 | GitHub → Deploy keys |
| D14 | AWS Activate Founders credits application submitted | 2026-10-31 | startups.aws |
| D15 | 9 categories, AI professors, goal check, 4-step onboarding | 2026-11-01 | `c31f5be`, migration 004 |
| D16 | Class-style lessons: typed blocks, section-by-section stepper, gated checkpoints | 2026-11-01 | `c31f5be` |
| D17 | Fix: onboarding submitted from the second-last step | 2026-11-01 | `c31f5be` |
| D18 | Ask the professor: lesson chat, quick buttons, quotas in Postgres, cache, $2/day budget | 2026-11-01 | `f97ddab`, `b715e49`, migration 005 |
| D19 | Email/password sign-up, login, forgot/reset password; old `/auth/*` pages retired; open-redirect fix | 2026-11-01 | `5225046` |
| D20 | Account page, settings (password, sign-in methods, sign out everywhere, delete account), avatar menu | 2026-11-01 | `b91e899`, migration 006 |
| D21 | Plans (Free/Pro), credit ledger, course limits, credits for extra questions/courses | 2026-11-01 | `37e57e1`, migration 007 |
| D22 | G20 lockdown: server-key RPCs for course/lesson writes, quiz graded in DB, quiz answers hidden | 2026-11-01 | `d151f31`, migration 008 |
| D23 | Policy page drafts (Terms, Privacy, Refund); one price list for home + /pricing | 2026-11-01 | `d151f31` |
| D24 | Razorpay payments (test mode): credit packs + Pro 30-day pass, webhook, payment history; test payment verified | 2026-11-01 | `6d1420d`, migration 009 |
| D25 | Usage meters show credit headroom; course-count backfill | 2026-11-01 | `9b95e8b`, migration 010 |

## Phase 0 — Security follow-up

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 0.1 | Rotate OpenRouter key; set a monthly spending limit | P0 | ⬜ | 👤 | Key was pasted in chat |
| 0.2 | Delete Bedrock API key and IAM user `BedrockAPIKey-23lt` | P0 | ⬜ | 👤 | On disk during the attack |
| 0.3 | Revoke the GitHub PAT used for the first push | P0 | ⬜ | 👤 | Pasted in chat |
| 0.4 | Restart the Claude Code session | P0 | ⬜ | 👤 | Session token was in the dumped env |
| 0.5 | Decide: keep patched instance or rebuild from repo | P1 | ⬜ | 👤 | No persistence found |
| 0.6 | Enable Dependabot alerts + security updates | P1 | ⬜ | 👤 | Repo settings → Code security |
| 0.7 | Nginx rate limiting on POST; block scanner paths; consider Cloudflare | P1 | ✅ | | S1.5; config backup `nxtai.bak-20261101123932` |
| 0.8 | Lock down direct writes to `courses` / `course_modules` / `lessons` | P1 | ✅ | | D22 |
| 0.10 | Regenerate Razorpay test secrets before go-live (shared in chat) | P1 | ⬜ | 👤 | G24 |
| 0.9 | AI keys out of `.env.local` (secret store / EC2 IAM role) | P2 | ⬜ | 🤖 | After Bedrock access |

## Phase 1 — Sign-in

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 1.1 | Enable OAuth providers; Site URL + redirect URLs | P0 | 🟡 | 👤 | GitHub ✅; Google ⬜ |
| 1.2 | Profile rows, protected routes, `/error` | P0 | ✅ | | D5, D8 |
| 1.6 | Email/password in the new design; retire `/auth/*` pages | P1 | ✅ | | D19 |
| 1.7 | Signed-in state in the site navbar | P1 | ✅ | 🤖 | Navbar since `ed2e4b2`; home and pricing buttons follow the signed-in state |
| 1.8 | Verify GitHub sign-in end to end on a phone | P0 | ✅ | 👤 | Used on a phone 2026-11-01 |
| 1.9 | Custom SMTP for auth emails (confirm / reset) | P0 | ✅ | 👤 | Spacemail `info@krpex.in` (mail.spacemail.com:465); SPF, DKIM (`spacemail`), DMARC set. Branded templates in `supabase/templates` (2026-11-05) |
| 1.10 | Email provider settings: confirm email ON, min password 8, redirect `https://krpex.in/**` | P0 | ✅ | 👤 | Supabase → Authentication |
| 1.11 | Test email sign-up and password reset on a phone | P0 | ✅ | 👤 | 2026-11-05 |
| 1.12 | Cross-device email links (`token_hash` templates) | P2 | ✅ | 👤🤖 | G22 — templates link to `/auth/confirm` (`3999a4b`) |

## Phase 2 — Production hosting

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 2.1 | Elastic IP, DNS, HTTPS | P0 | ✅ | | D7 |
| 2.3 | `pm2 startup` + `pm2 save`; `pm2-logrotate` | P0 | ⬜ | 👤 | Needs one sudo command |
| 2.4 | Deploy script, then GitHub Actions deploy on push | P1 | 🟡 | 🤖 | `scripts/deploy.sh` ✅; Actions later. One build at a time (1.8 GB RAM) |
| 2.5 | Uptime monitoring + alerts; Supabase backups | P1 | ⬜ | 👤🤖 | |
| 2.6 | Decide long-term host (EC2 or Vercel) | P2 | ⬜ | 👤 | |

## Phase 3 — Public site

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 3.1 | One price list for home and `/pricing`, matching plans + credit packs | P0 | ✅ | | G5 — `lib/pricing.ts`; only features that exist |
| 3.2 | Terms, Privacy, Refund & Cancellation pages (Razorpay requirement) | P0 | 🟡 | 👤 | D23 — fill `lib/legal.ts` (legal name, address, city) and review (G23) |
| 3.4 | Contact form email notification | P1 | 🟡 | 🤖 | Saving ✅ |
| 3.5 | Favicon, OG image, metadata, sitemap, robots | P1 | ✅ | 🤖 | `app/icon.svg`, apple icon, site + per-course sharing images (`lib/og.tsx`), metadataBase |
| 3.6 | Analytics + Sentry | P2 | ⬜ | 👤🤖 | |

## Phase 4 — Dashboard on real data

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 4.1 | Dashboard on the site design system; merge with `/learn` | P1 | ✅ | | S4.1: streak, lessons, study time, quiz average, last-7-days chart and "Continue learning" on `/learn`; sample-data `/dashboard` removed (redirects to `/learn`) |
| 4.2 | Real progress, scores, streaks | P1 | ✅ | 🤖 | Progress panel on `/learn` (S4.1) |
| 4.3 | Delete legacy components, CSS, compat shim | P2 | ✅ | 🤖 | 77 unused files and 41 unused packages removed |

## Phase 5 — Core product

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 5.1 | Learning loop | P1 | ✅ | | D9 |
| 5.1a | Verify the learning loop end to end on a phone | P0 | 🟡 | 👤 | Lessons + chat used; full course not yet |
| 5.A | Categories + AI professors | P1 | ✅ | | D15 |
| 5.B | Class-style lessons | P1 | ✅ | | D16 |
| 5.C | Diagrams in lessons (flow, cycle, hierarchy, comparison, timeline) | P1 | ✅ | | S2.2 — drawn by our own components from AI data |
| 5.C2 | Math formulas (KaTeX) + code highlighting with Copy | P1 | ✅ | | S2.1 |
| 5.D | Illustrations (max 2/lesson, cached) + photos | P1 | ⏸️ | 🤖 | Paused 2026-11-01. Tested: Cloudflare Workers AI works (keys in .env.local). Free → flux-2-klein-4b (~104 neurons, ₹0.10), Pro → flux-2-klein-9b (~1,364 neurons, ₹1.30); free plan = 10k neurons/day. OpenRouter image models need ≥$1 balance |
| 5.E | Ask the professor | P1 | ✅ | | D18 |
| 5.F | Catalog courses + narration | P2 | ✅ | | Catalog ✅: 15 hand-written courses (all 9 subjects) at `/courses` + `/courses/[slug]`, one-tap start via `app_create_course` (counts toward the monthly allowance), suggestions on `/learn`, sitemap + robots. Narration ✅: "Listen" in lessons uses the browser's speech engine (free, no server); reads section by section, waits at practice questions, then reads the takeaways; speed 0.8–1.5×. Natural cloud voices later (Cloudflare TTS) |
| 5.1b | Regenerate lesson / report a problem; course archive & delete | P1 | 🟡 | 👤 | S1.3 — needs migration 011 |
| 5.1c | Stream lesson text while it is written | P2 | ✅ | 🤖 | `ed2e4b2` |
| 5.2 | Doc upload → lessons from the learner's docs | P1 | ✅ | 🤖 | `b7e02ec` PDF/Word/text (Free 1 file·50 pp, Pro 3·300); text only, no OCR |
| 5.3 | Module tests, final exam, certificates | P1 | ✅ | | Deployed 2026-11-02 (migration 014). Module test per module (8 AI-written questions, unlocks when its lessons are passed, retry after 1 h), final exam (20 questions, unlocks when every module test is passed, 2 tries/day IST), pass mark 70%, graded in the DB, answers shown only once passed. Certificates Pro only: public /certificate/[code] (print to PDF, LinkedIn, preview image), labelled AI professor / not accredited. Needs OpenRouter credits to write new tests |
| 5.7 | XP and levels (streaks already on `/learn`) | P2 | ✅ | 🤖 | Built: migration 026 (ledger written only by DB triggers, once per reward, kept when a course is deleted, backfilled). Lesson passed 10, perfect quiz +5, module test 25, final exam 50, new study day 5. Level card on `/learn`, "+N XP" on quiz/test results. Live 2026-11-07 (`60e5741`) |
| 5.7b | Streak freeze + level rewards ladder | P2 | 🟡 | 🤖 | plan.md "XP and rewards". Freeze: L2 + every 7-day streak, max 2, used automatically. Ladder: L3 10 cr · L5 20 cr · L7 25 cr · L10 7-day Pro + free certificate · L15 50 cr · L20 100 cr. Built: migration 027 (freezes used by the app server every 10 min; 7 pm streak reminder counts frozen days; free certificate via `issue_certificate`). Needs migration 027 |
| 5.7c | Share card (level, streak, courses) for WhatsApp / LinkedIn | P3 | ⬜ | 🤖 | |
| 5.4 | Coding practice on code.krpex.in: browser runner (Pyodide / JS worker), problems, XP, AI help | P2 | 🟡 | 👤🤖 | plan.md "Coding practice". A+B live 2026-11-07 (subdomain, shared sign-in, sandboxed runner, playground). C live 2026-11-08: 70 problems, /problems, /p/<slug>, submissions + XP + problem of the day (migration 028). **v2 Phase 1 live 2026-11-09** (plan.md "Krpex Code v2"): problem table with filters/search/pick one + solved ring + activity calendar; full-screen workspace (resizable panes, problem list drawer, Description/Solution/Submissions/Result, editable test cases with server-computed expected answers, per-case stdout, verdicts, runtimes); tags + hints for all 70; honest solutions. **v2 Phase 2 live 2026-11-09**: problems 71–150 (new topics Stacks and queues, Grids, Dynamic programming; editorials shown with the official solution; migration 030). **v2 Phase 3 live 2026-11-09**: AI coach tab — hints in 3 steps with a guard that blocks the solution, "explain my failing test", review after solving; free 3/day, Pro 30, then 1 credit; shared spend cap (migration 031). **v2 Phase 4 live 2026-11-09**: 5 study plans (/plans) with progress, follow (max 5), finish bonus + badge via xp_events 'plan:<slug>' (migration 032); plan mode in the workspace (?plan=); "continue your plans" on the Code home; coding lessons (python/dsa/web-dev) end with 3 matched practice problems. Next: Phase 5 (community) |
| 5.5 | Mock interviews | P2 | ⏸️ | 👤🤖 | Parked 2026-11-07: aim is a real interview experience; plan after XP and coding |
| 5.6 | Communities | P2 | 🟡 | 🤖 | plan.md "Krpex Code v2" → Phase 5 (5a profiles · 5b problem solutions + discussion + moderation · 5c general board + course communities). **5a built 2026-11-10**: handles + public profiles (migration 033). **Live 2026-11-10** (`c206847`). **Own site community.krpex.in** (built 2026-11-10): same app under app/(community)/community, host routing in lib/code-host.ts + next.config.mjs, header, home, /guidelines, robots + sitemap (public profiles), profiles moved to community.krpex.in/u/<handle> (code.krpex.in/u/* → 308). **Live 2026-11-10** (`941effc`; DNS, Nginx and certificate done). **5b built 2026-11-10** (migration 034): per-problem Solutions (locked until solved or official solution opened) and Discussion on community.krpex.in/p/<slug>/…, posts with Markdown + code, one-level comments, upvotes, reports (3 from L2+ hide), admin queue + bans + profile hiding in /admin#community, reply/upvote/removal notifications, workspace Community card, terms + privacy. **Live 2026-11-11** (`3865298`). **5c built 2026-11-11** (migration 035): boards on community.krpex.in/c — Help, Interview prep, Show your project, Feedback, plus one per course category (9); home page feed of the latest active discussions (problems + boards, never solutions); "From the community" on the Code home; "Course communities" on /learn; "Ask the community" at the end of lessons (opens the subject board with the lesson as the title); "Professor" label for approved professor accounts (they skip the level/age rules; AI professors never post); boards in the sitemap; guideline on who's who. Needs migration 035 |
| 5.8 | Switch AI to Bedrock once AWS grants access | P2 | ⛔ | 👤 | G14 |

## Admin panel (build Phase 6, planned 2026-11-11)

Plan: plan.md "Krpex Code v2" → Phase 6. IDs A.x to keep them apart from Payments 6.x.

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| A.1 | Split `/admin` into sections: Overview, Users, Money, Lesson reports, Community, Professors, System | P1 | 🟡 | 🤖 | **Built 2026-11-11** (no migration): `/admin/*` routes with a sidebar (tabs on phones), each loading only its data (lib/admin/data.ts, cached per request); outage banner on every section; "Needs attention" on the overview; `/admin#community` → `/admin/community`. Signed-in e2e test in teach.spec.ts (runs in CI only) |
| A.2 | One page per learner + paged, filtered users list + admin audit log | P1 | 🟡 | 🤖 | **Built 2026-11-11** (migration 036): `/admin/users` paged 50 at a time with search (email, name, @handle), plan, activity and sort filters; `/admin/users/<id>` with account, credits and Pro (grant in place + credit history), learning, AI use, payments, Code, community (ban/unban, hide/show profile in place, recent posts), lesson reports sent, admin history; `private.admin_log` written by `admin_grant`, shown with the community moderation log on the learner page and as "Admin activity" on System. AI cost per learner covers professor questions and the coding coach (course plans and lessons are counted; costed per learner in A.4). **Needs migration 036** |
| A.3 | Community moderation: filtered queue, bans with expiry/lift, moderation history, boards on/off | P1 | 🟡 | 🤖 | Built 2026-11-13 (migration 037): queue filter, bans list with Lift, boards on/off (off boards leave the public lists and take no new discussions), paged moderation history; professor, invite and lesson-report actions now in the audit log. **Needs migration 037** |
| A.4 | Money and AI: revenue and AI cost by day/model/feature, costliest learners, paged payments | P2 | ⬜ | 🤖 | Needs a migration |
| A.5 | Code: submissions and acceptance per problem, unsolved problems, runner errors, coach use | P2 | ⬜ | 🤖 | Needs a migration |
| A.6 | System: errors by date range, deploys and health checks | P3 | ⬜ | 🤖 | |

## Phase 6 — Payments (Razorpay)

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 6.1 | Plans, limits, credit ledger in Postgres; account page shows them | P1 | ✅ | | D21 |
| 6.2 | Razorpay account + KYC; test-mode keys and webhook | P1 | 🟡 | 👤 | Test mode working (D24); KYC + live keys pending |
| 6.6 | Run migration 010 (count courses created before 007) | P1 | ✅ | | |
| 6.7 | Go live: live keys, new webhook secret, test a ₹1 real payment | P1 | ⬜ | 👤🤖 | After KYC + G23 |
| 6.8 | GST registration / invoice format decision | P2 | ⬜ | 👤 | Razorpay sends payment receipts |
| 6.3 | Credit packs + Pro 30-day pass: server-created orders, Checkout, signature check, webhook `/api/razorpay/webhook` | P1 | ✅ | | Migration 009; server-key RPCs instead of an Edge Function; idempotent per order |
| 6.4 | Auto-renewing Pro (Razorpay Subscriptions + UPI autopay) | P2 | ⬜ | 🤖 | v1 sells a 30-day pass |
| 6.5 | Payment history and receipts on `/account` | P2 | 🟡 | 🤖 | History ✅; receipts via Razorpay emails |

## Phase 7 — Quality

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 7.1 | Fix remaining TS errors (all in `hero-animation.tsx`); stop ignoring TS/ESLint in builds | P1 | ✅ | | 0 errors; `pnpm typecheck` runs in CI (the server build still skips it to save memory) |
| 7.2 | Next 16; drop `auth-helpers-nextjs`; update `recharts`; clear audit highs | P1 | ✅ | 🤖 | Next 16.4.3 (Turbopack build, 42 s, 1.1 GB peak), Zod 4, KaTeX 0.18.10; removed unused auth-helpers, appwrite, recharts; `middleware.ts` → `proxy.ts`; `pnpm audit`: 0 |
| 7.3 | Playwright e2e + visual regression tests | P1 | ✅ | | Unit (Vitest), database (PGlite: RLS, server key, limits, payments), Playwright smoke tests, and signed-in browser tests (onboarding → course, lesson taught + quiz passed, AI professor, My courses progress, catalog limits/delete, account) against a local Supabase + fake AI in CI: `pnpm test`, `pnpm test:e2e`, `pnpm test:e2e:signed-in`. Supabase CLI pinned to 2.122.1 in CI. Visual regression optional, not done |
| 7.4 | CI on pull requests | P1 | ✅ | | `.github/workflows/ci.yml`: typecheck → tests → build → smoke tests, on push to dev/main and PRs |

## Phase 8 — Professor portal (pilot: Physics, English + Hindi)

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 8.0 | Contributor agreement (licence, name/photo/style consent, withdrawal, own-material rule) + programme page; lawyer review | P1 | ⬜ | 👤 | Before inviting professors |
| 8.0b | Recruit 2–3 Physics professors (volunteers) | P1 | ⬜ | 👤 | |
| 8.1 | Portal `/teach`: invites from `/admin`, professor profile, agreement, uploads (reuse 5.2), model-lesson editor, review queue (rate/edit/comment), drafts + publish, withdraw | P1 | ✅ | 🤖 | Part 1 live (migration 016): invites, join + agreement (draft), profile, uploads, publish/withdraw, admin approve/pause. Part 2 live (migration 017): model-lesson editor with live preview. Part 3 live (migration 018): review queue: admin writes sample AI Physics lessons (topic, level, language; no learner data), approved professors rate 4 ways, comment and suggest block-by-block rewrites; admin sees averages and notes |
| 8.2 | Professor-backed lessons: teaching profile + examples + search over their material in lessons, tests and chat; professor choice in onboarding; "Taught by Prof. X (AI)" + professor page | P1 | ✅ | 🤖 | Live 2026-11-04 (migration 020): "How you teach" + "Show my AI professor to learners" on `/teach` (with a preview); admin "Make live"/"Hide"; public `/professors/[id]` (live only); onboarding "Who should teach you?" for subjects with live professors (course stores `p:<id>`); lessons (12k chars), tests (8k), chat (4k) and course plans (6k) get the professor's style, their best-matching published sections (Postgres full-text, 'simple', works for Hindi) and best-matching model lesson; always "Name (AI)", "AI version" badge. Paused/hidden → falls back to the AI persona |
| 8.3 | Hindi teaching language: onboarding choice, lessons/quizzes/tests/chat in Hindi, Devanagari font | P1 | ✅ | 🤖 | Live 2026-11-05 (migration 021, `bde7563`): "Teach me in" at onboarding + Account default; plan, lessons, tests and chat in Hindi (English terms in brackets); Noto Sans Devanagari; Hindi-aware answer protection. Site UI itself stays English |
| 8.4 | Lecture audio/video transcription; question banks; flagged learner questions → professor inbox | P2 | ✅ | 🤖 | Part 1 (migration 019, 2026-11-04): upload a recording → Sarvam batch STT → professor corrects the transcript → material. Part 2 (migration 022, `51d7e38`, 2026-11-05): record in the browser; question banks (up to half of module tests / final exams in professor-backed courses, matching topic + language); learners send an AI answer to the real professor (3/day), who replies or confirms without seeing who asked |
| 8.5 | Measure: professor ratings, learner ratings, pass rates, completion (professor-backed vs. generic) | P2 | ⬜ | 🤖 | |
| 8.6 | Retrain an open model on reviewed data | P3 | ⬜ | 🤖 | Only after ~5,000 reviewed items |

## Phase 9 — Live updates and notifications

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 9.1 | Live updates: pages change without a refresh | P1 | ✅ | 🤖 | Live (`9fbef9a`, migration 023 applied). Signed-in browser test (`teach.spec.ts` test 5) waits for CI. One `notifications` table filled by database triggers; each signed-in tab listens to its own rows over Supabase Realtime and refreshes the data on screen. Also refreshes when you come back to a tab, and polls every 60 s if the live connection drops. No new dependencies |
| 9.2 | In-app notifications: bell with unread count, list, mark as read, pop-up for new ones | P1 | ✅ | 🤖 | Live (`9fbef9a`). Same table as 9.1. Kept 90 days. Built with 9.1 (migration 023): bell + pop-ups in the app header, `/notifications`. Events: learner question → professor; reply/confirm → learner (opens the chat); approved/paused/live/hidden and new review lessons → professor; payment, credits/Pro granted, report resolved → learner; new professor, go-live request, new report → admins |
| 9.3 | Email for important notifications, as a digest, with per-type settings and unsubscribe | P2 | ✅ | 👤🤖 | Live (`9c621c3`); first email received 2026-11-07 (Gmail put it under Updates). Built (migration 024, nodemailer 7.0.13 approved). The app server checks every 5 min and emails each person the notifications they haven't read in the app (10-min wait, max 3 days old): hourly by default, or daily / off, per topic, on `/account/settings#email`. One-click unsubscribe (`/unsubscribe`, `List-Unsubscribe` header). Migration 024 applied; SMTP settings in `.env.local` |
| 9.4 | Phone/browser push notifications (opt-in) | P2 | ✅ | 👤🤖 | Live (`d645fc6`, test button `52c4d2e`); first push received on Android Chrome 2026-11-07. Chrome may flag a new site's notifications as "possible spam" until the user taps Always allow. Built (migration 025): Web Push with Node's own crypto, no library (matches the RFC 8291 example). Turn on per device at `/account/settings#push`; the server pushes new notifications every minute; dead devices are removed. iPhone needs Krpex added to the Home Screen (new `app/manifest.ts`). Only Google/Apple/Mozilla/Microsoft push addresses are accepted. VAPID keys in `.env.local`; migration 025 applied |
| 9.5 | Reminders: "continue your course", streak about to break | P3 | ✅ | 🤖 | Built (migration 025), run by the app server at 7 pm IST, no cron: "keep your N-day streak" (studied yesterday, not today), "continue <course>" after 3–30 quiet days, max once a week. Bell + push + email; off switch in settings. First live run 2026-11-07: 4 reminders |
| 9.6 | WhatsApp notifications through AiSensy | P3 | ⬜ | 👤🤖 | After 9.3; templates need Meta approval |

## Bugs

| ID | Bug | Pri | Status | Owner | Notes |
|----|-----|-----|--------|-------|-------|
| B1 | Ask the professor gives away quiz, checkpoint and test answers | P1 | ✅ | 🤖 | `148d799`. Reported 2026-11-04. The chat should hint and guide the learner's reasoning, never state the correct option, until that question is answered. Current prompt rule (`PROFESSOR_SYSTEM` in `lib/ai/llm.ts`) only says "guide their reasoning instead of just giving the letter" — too weak. Fix: stronger rule, keep answer keys out of the chat context, refuse while a module test / final exam is in progress, and a test with the fake AI |
| B2 | Multi-line maths in lessons shows as raw red LaTeX | P1 | ✅ | 🤖 | Fixed by `tidyMath` (`lib/learning/math.ts`). Reported 2026-11-04 (worked example "Distributive law, fully worked"). A `$$\begin{aligned}…&\iff…\\…\end{aligned}$$` block starting mid-paragraph or spanning lines isn't turned into display maths (`displayMath()` in `components/learn/lesson-blocks.tsx` only handles one-line `$$…$$`), so KaTeX fails on `&`/`\\` and, with `throwOnError: false`, prints the source in red; the next `$$x$$` pairs wrongly, so the rest of the paragraph turns red too. Fix: normalise multi-line/mid-line `$$` blocks (and `\[…\]`, `\begin{…}` without `$$`) before remark-math, tell the AI to put display maths on its own lines, and show a plain-text fallback instead of red source; unit tests with this sample |
| B3 | Chat answers show raw `*` instead of bullet points | P1 | ✅ | 🤖 | Reported 2026-11-05 ("Distance vs displacement" answer on a phone). The AI sometimes writes a list marker Markdown doesn't recognise (`*` + non-breaking space, escaped `\*`, `•`). Fixed and live (`4ccd8c1`): `tidyLists` in `lib/learning/math.ts`, run by the shared Markdown renderer for chat, lessons, quizzes and the inbox; `tests/unit/lists.test.ts` |

## Next up — Sprint 1: ready for real users (proposed)

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| S1.1 | Signed-in navbar on public pages ("My courses" + avatar) | P1 | ✅ | | G18; /login and /create-account redirect signed-in users |
| S1.2 | Stream lesson text while it is generated | P1 | ✅ | | `/api/lessons/stream`; first text ~5 s instead of ~30 s |
| S1.3 | Course delete/archive; regenerate a lesson (5 credits, 5/day); report a problem | P1 | ✅ | | Migrations 010–011 applied |
| S1.4 | Admin page: users, usage, AI spend, payments, reports, grant credits/Pro | P1 | ✅ | | `/admin` (migration 012) |
| S1.5 | Nginx rate limits + deploy script | P1 | ✅ | | Limits + scanner blocking live; `scripts/deploy.sh` (build aside, swap, health check, rollback) used for the c9b4520 deploy |
| S1.6 | Uptime monitoring + error tracking | P1 | ✅ | | Migration 013 applied; `/api/health` + UptimeRobot monitor |

## Admin: give a learner credits or Pro by SQL

Run in the Supabase SQL editor (replace the email):

```sql
-- 100 credits
insert into public.credit_ledger (user_id, delta, reason, note)
select id, 100, 'grant', 'manual grant' from auth.users where email = 'learner@example.com';

-- Pro for 30 days
insert into public.user_plans (user_id, plan, status, current_period_end)
select id, 'pro', 'active', now() + interval '30 days' from auth.users where email = 'learner@example.com'
on conflict (user_id) do update set plan = 'pro', status = 'active',
  current_period_end = excluded.current_period_end, updated_at = now();
```
