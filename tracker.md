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
| 0.7 | Nginx rate limiting on POST; block scanner paths; consider Cloudflare | P1 | ⬜ | 🤖 | |
| 0.8 | Lock down direct writes to `courses` / `course_modules` / `lessons` | P1 | ✅ | | D22 |
| 0.10 | Regenerate Razorpay test secrets before go-live (shared in chat) | P1 | ⬜ | 👤 | G24 |
| 0.9 | AI keys out of `.env.local` (secret store / EC2 IAM role) | P2 | ⬜ | 🤖 | After Bedrock access |

## Phase 1 — Sign-in

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 1.1 | Enable OAuth providers; Site URL + redirect URLs | P0 | 🟡 | 👤 | GitHub ✅; Google ⬜ |
| 1.2 | Profile rows, protected routes, `/error` | P0 | ✅ | | D5, D8 |
| 1.6 | Email/password in the new design; retire `/auth/*` pages | P1 | ✅ | | D19 |
| 1.7 | Signed-in state in the site navbar | P1 | ⬜ | 🤖 | G18 |
| 1.8 | Verify GitHub sign-in end to end on a phone | P0 | ✅ | 👤 | Used on a phone 2026-11-01 |
| 1.9 | Custom SMTP for auth emails (confirm / reset) | P0 | ⬜ | 👤 | G21 — Hostinger `info@krpex.in`, Resend or SES |
| 1.10 | Email provider settings: confirm email ON, min password 8, redirect `https://krpex.in/**` | P0 | ⬜ | 👤 | Supabase → Authentication |
| 1.11 | Test email sign-up and password reset on a phone | P0 | ⬜ | 👤 | After 1.9 |
| 1.12 | Cross-device email links (`token_hash` templates) | P2 | ⬜ | 👤🤖 | G22 |

## Phase 2 — Production hosting

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 2.1 | Elastic IP, DNS, HTTPS | P0 | ✅ | | D7 |
| 2.3 | `pm2 startup` + `pm2 save`; `pm2-logrotate` | P0 | ⬜ | 👤 | Needs one sudo command |
| 2.4 | Deploy script, then GitHub Actions deploy on push | P1 | ⬜ | 🤖 | |
| 2.5 | Uptime monitoring + alerts; Supabase backups | P1 | ⬜ | 👤🤖 | |
| 2.6 | Decide long-term host (EC2 or Vercel) | P2 | ⬜ | 👤 | |

## Phase 3 — Public site

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 3.1 | One price list for home and `/pricing`, matching plans + credit packs | P0 | ✅ | | G5 — `lib/pricing.ts`; only features that exist |
| 3.2 | Terms, Privacy, Refund & Cancellation pages (Razorpay requirement) | P0 | 🟡 | 👤 | D23 — fill `lib/legal.ts` (legal name, address, city) and review (G23) |
| 3.4 | Contact form email notification | P1 | 🟡 | 🤖 | Saving ✅ |
| 3.5 | Favicon, OG image, metadata, sitemap, robots | P1 | ⬜ | 🤖 | |
| 3.6 | Analytics + Sentry | P2 | ⬜ | 👤🤖 | |

## Phase 4 — Dashboard on real data

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 4.1 | Dashboard on the site design system; merge with `/learn` | P1 | ⬜ | 🤖 | G10 (profile/settings already moved to `/account`) |
| 4.2 | Real progress, scores, streaks | P1 | ⬜ | 🤖 | |
| 4.3 | Delete legacy components, CSS, compat shim | P2 | ⬜ | 🤖 | |

## Phase 5 — Core product

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 5.1 | Learning loop | P1 | ✅ | | D9 |
| 5.1a | Verify the learning loop end to end on a phone | P0 | 🟡 | 👤 | Lessons + chat used; full course not yet |
| 5.A | Categories + AI professors | P1 | ✅ | | D15 |
| 5.B | Class-style lessons | P1 | ✅ | | D16 |
| 5.C | Diagrams as code in lessons (Mermaid / SVG) | P1 | ⬜ | 🤖 | |
| 5.D | Illustrations: GPT-5 Image Mini (max 2/lesson, cached in Storage) + photos | P1 | ⬜ | 🤖 | |
| 5.E | Ask the professor | P1 | ✅ | | D18 |
| 5.F | Catalog courses + narration | P2 | ⬜ | 🤖 | |
| 5.1b | Regenerate lesson / report a problem; course archive & delete | P1 | ⬜ | 🤖 | |
| 5.1c | Stream lesson text while it is written | P2 | ⬜ | 🤖 | |
| 5.2 | Doc upload → lessons from the learner's docs | P1 | ⬜ | 🤖 | |
| 5.3 | Module tests, final exam, certificates | P1 | 🟡 | 🤖 | Per-lesson quizzes done |
| 5.4–5.7 | Coding practice, mock interviews, communities, XP/streaks | P2 | ⬜ | 🤖 | |
| 5.8 | Switch AI to Bedrock once AWS grants access | P2 | ⛔ | 👤 | G14 |

## Phase 6 — Payments (Razorpay)

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 6.1 | Plans, limits, credit ledger in Postgres; account page shows them | P1 | ✅ | | D21 |
| 6.2 | Razorpay account + KYC; test-mode keys and webhook | P1 | 🟡 | 👤 | Test mode working (D24); KYC + live keys pending |
| 6.6 | Run migration 010 (count courses created before 007) | P1 | ⬜ | 👤 | SQL in `supabase/migrations/…010…` |
| 6.7 | Go live: live keys, new webhook secret, test a ₹1 real payment | P1 | ⬜ | 👤🤖 | After KYC + G23 |
| 6.8 | GST registration / invoice format decision | P2 | ⬜ | 👤 | Razorpay sends payment receipts |
| 6.3 | Credit packs + Pro 30-day pass: server-created orders, Checkout, signature check, webhook `/api/razorpay/webhook` | P1 | ✅ | | Migration 009; server-key RPCs instead of an Edge Function; idempotent per order |
| 6.4 | Auto-renewing Pro (Razorpay Subscriptions + UPI autopay) | P2 | ⬜ | 🤖 | v1 sells a 30-day pass |
| 6.5 | Payment history and receipts on `/account` | P2 | 🟡 | 🤖 | History ✅; receipts via Razorpay emails |

## Phase 7 — Quality

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 7.1 | Fix remaining TS errors (all in `hero-animation.tsx`); stop ignoring TS/ESLint in builds | P1 | 🟡 | 🤖 | G9 — 19 left |
| 7.2 | Next 16; drop `auth-helpers-nextjs`; update `recharts`; clear audit highs | P1 | 🟡 | 🤖 | G12, G15 |
| 7.3 | Playwright e2e + visual regression tests | P1 | ⬜ | 🤖 | |
| 7.4 | CI on pull requests | P1 | ⬜ | 🤖 | |

## Next up — Sprint 1: ready for real users (proposed)

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| S1.1 | Signed-in navbar on public pages ("My courses" + avatar) | P1 | ✅ | | G18; /login and /create-account redirect signed-in users |
| S1.2 | Stream lesson text while it is generated | P1 | ✅ | | `/api/lessons/stream`; first text ~5 s instead of ~30 s |
| S1.3 | Course delete/archive; regenerate a lesson (uses credits); report a problem | P1 | ⬜ | 🤖 | 5.1b |
| S1.4 | Admin page: users, usage, AI spend, payments, grant credits/Pro | P1 | ⬜ | 🤖 | G25 |
| S1.5 | Nginx rate limits + deploy script | P1 | ⬜ | 🤖 | 0.7, 2.4 |
| S1.6 | Uptime monitoring + error tracking (Sentry) | P1 | ⬜ | 👤🤖 | 2.5, 3.6 |

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
