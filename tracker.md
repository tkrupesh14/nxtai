# NxtAI — Tracker

Plan and context: [plan.md](./plan.md). Update the **Status** column as work moves.

**Status:** ⬜ Todo · 🟡 In progress · ✅ Done · ⛔ Blocked
**Priority:** P0 = blocks launch · P1 = needed soon · P2 = later

## Done

| ID | Task | Done on | Ref |
|----|------|---------|-----|
| D1 | Clone repo, install Node 22, pnpm, Nginx and pm2 on EC2 | 2026-10-31 | — |
| D2 | Serve the app publicly via Nginx → pm2 at `http://3.25.236.158` | 2026-10-31 | — |
| D3 | Switch to the `dev` branch and configure Supabase env vars | 2026-10-31 | — |
| D4 | Public pages match nxtai.in exactly; Tailwind v4 upgrade; OAuth callback route | 2026-10-31 | `e71289b` |

## Phase 1 — Sign-in works end to end

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 1.1 | Enable GitHub and Google providers in Supabase; add callback URL to the allow-list | P0 | ⬜ | | Needs Supabase dashboard access (G1) |
| 1.2 | Auto-create `users` profile row for OAuth sign-ups (trigger or callback upsert) and backfill | P0 | 🟡 | | App side done (callback + dashboard create the row, never bounce). Run `supabase/migrations/20261031000001_profile_trigger.sql` for trigger + backfill |
| 1.3 | Redirect unauthenticated dashboard visits to `/login`; decide on email/password | P0 | ✅ | | `/login?next=…`; email/password kept, linked from `/login` and `/create-account` |
| 1.4 | Add `/error` page and `app/error.tsx`; show `?error=oauth` on login | P0 | ✅ | | `/error?reason=login\|signup\|confirm`; OAuth button errors shown inline |
| 1.5 | Protect `/dashboard/*` in middleware | P1 | ✅ | | Middleware also refreshes the session now |

## Phase 2 — Production hosting

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 2.1 | Elastic IP and DNS for the domain | P0 | ✅ | | `krpex.in` → Elastic IP `54.79.194.65` |
| 2.2 | HTTPS via certbot; HTTP → HTTPS redirect; update Supabase URLs | P0 | ✅ | | Let's Encrypt via certbot; set Supabase Site URL to `https://krpex.in` |
| 2.3 | `pm2 startup` + `pm2 save`; log rotation | P0 | ⬜ | | Needs a sudo command run by you |
| 2.4 | Deploy script, then GitHub Actions auto-deploy | P1 | ⬜ | | |
| 2.5 | Decide long-term host (EC2 or Vercel) | P1 | ⬜ | | |

## Phase 3 — Public site fixes

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 3.1 | Single source of truth for prices (home ≠ `/pricing` today) | P0 | ⬜ | | G5 — needs a business decision |
| 3.2 | Mobile navigation menu | P1 | ✅ | | `components/site/mobile-menu.tsx` |
| 3.3 | Fix footer links on non-home pages | P1 | ✅ | | `/#platform`, `/#features`, `/pricing`, `/contact` |
| 3.4 | Contact form → Supabase table + email + toast | P1 | 🟡 | | Server action + inline confirmation done. Run `supabase/migrations/20261031000002_contact_messages.sql`. Email notification still todo |
| 3.5 | Favicon, OG image, per-page metadata, sitemap, robots | P1 | ⬜ | | |
| 3.6 | Analytics + Sentry | P2 | ⬜ | | |

## Phase 4 — Dashboard rebrand

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 4.1 | Dashboard on site tokens, Geist and `components/site/ui` | P1 | ⬜ | | G10 |
| 4.2 | One theme system; drop legacy CSS, compat shim, `tailwindcss-animate` | P1 | ⬜ | | |
| 4.3 | Delete unused legacy components and `styles/globals.css` | P2 | ⬜ | | |

## Phase 5 — Core product

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 5.1 | Onboarding quiz → AI personal course plan | P1 | 🟡 | | Built: `/onboarding` → Claude course plan → `/learn` → AI lessons + graded quizzes, progress unlocks. AI: GPT-6 Luna on Bedrock (`lib/ai/llm.ts`). Needs migration + `BEDROCK_API_KEY` |
| 5.2 | Doc upload (Storage) → AI lessons from user docs | P1 | ⬜ | | |
| 5.3 | AI assessments and grading | P1 | 🟡 | | Per-lesson quizzes done (server-graded, 60% to pass); standalone assessments todo |
| 5.4 | Proctored coding environment | P2 | ⬜ | | |
| 5.5 | AI mock interviews | P2 | ⬜ | | |
| 5.6 | Communities, events, hackathons | P2 | ⬜ | | |
| 5.7 | XP, badges, streaks, leaderboard | P2 | ⬜ | | |

## Phase 6 — Payments

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 6.1 | Razorpay subscriptions (Pro, Host) | P2 | ⬜ | | After 3.1 |
| 6.2 | Webhooks → plan status in Supabase; feature gating | P2 | ⬜ | | |
| 6.3 | Billing page | P2 | ⬜ | | |

## Phase 7 — Quality

| ID | Task | Pri | Status | Owner | Notes |
|----|------|-----|--------|-------|-------|
| 7.1 | Fix 21 TS errors; stop ignoring TS/ESLint in builds | P1 | ⬜ | | G9 |
| 7.2 | Upgrade Next.js; remove `@supabase/auth-helpers-nextjs` | P1 | 🟡 | | **2026-10-31: next 15.2.4 → 15.5.28 after RSC RCE exploitation (env dumped by scanners).** Next: move to 16.x, drop auth-helpers, bump zod/postcss |
| 7.3 | Playwright e2e and visual regression tests | P1 | ⬜ | | |
| 7.4 | CI on pull requests (typecheck, lint, build, test) | P1 | ⬜ | | |
